use criterion::{black_box, criterion_group, criterion_main, Criterion, BenchmarkId};
use minimact::*;
use std::collections::HashMap;

fn create_tree(depth: usize, breadth: usize) -> VNode {
    if depth == 0 {
        return VNode::text("leaf");
    }

    let mut children = Vec::new();
    for i in 0..breadth {
        let child = create_tree(depth - 1, breadth);
        let keyed = VNode::keyed_element(
            "div",
            format!("key-{}", i),
            HashMap::new(),
            vec![child],
        );
        children.push(keyed);
    }

    VNode::element("div", HashMap::new(), children)
}

fn modify_tree(node: &VNode, change_percent: usize) -> VNode {
    match node {
        VNode::Text(text) => {
            if change_percent > 50 {
                VNode::text(format!("{}-modified", text.content))
            } else {
                node.clone()
            }
        }
        VNode::Element(elem) => {
            let children: Vec<VNode> = elem
                .children
                .iter()
                .enumerate()
                .map(|(i, child)| {
                    if (i * 100 / elem.children.len()) < change_percent {
                        modify_tree(child, change_percent)
                    } else {
                        child.clone()
                    }
                })
                .collect();

            VNode::Element(VElement {
                tag: elem.tag.clone(),
                props: elem.props.clone(),
                children,
                key: elem.key.clone(),
            })
        }
    }
}

fn bench_reconciliation_small(c: &mut Criterion) {
    let old_tree = create_tree(2, 3);
    let new_tree = modify_tree(&old_tree, 20);

    c.bench_function("reconcile_small_tree", |b| {
        b.iter(|| {
            reconcile(black_box(&old_tree), black_box(&new_tree))
        });
    });
}

fn bench_reconciliation_medium(c: &mut Criterion) {
    let old_tree = create_tree(3, 4);
    let new_tree = modify_tree(&old_tree, 20);

    c.bench_function("reconcile_medium_tree", |b| {
        b.iter(|| {
            reconcile(black_box(&old_tree), black_box(&new_tree))
        });
    });
}

fn bench_reconciliation_large(c: &mut Criterion) {
    let old_tree = create_tree(4, 5);
    let new_tree = modify_tree(&old_tree, 20);

    c.bench_function("reconcile_large_tree", |b| {
        b.iter(|| {
            reconcile(black_box(&old_tree), black_box(&new_tree))
        });
    });
}

fn bench_reconciliation_changes(c: &mut Criterion) {
    let mut group = c.benchmark_group("reconcile_by_change_percent");

    let tree = create_tree(3, 3);

    for change_percent in [0, 10, 25, 50, 75, 100].iter() {
        let modified = modify_tree(&tree, *change_percent);
        group.bench_with_input(
            BenchmarkId::from_parameter(format!("{}%", change_percent)),
            change_percent,
            |b, _| {
                b.iter(|| reconcile(black_box(&tree), black_box(&modified)));
            },
        );
    }

    group.finish();
}

fn bench_predictor(c: &mut Criterion) {
    let mut predictor = Predictor::new();

    let state_change = StateChange {
        component_id: "test".to_string(),
        state_key: "value".to_string(),
        old_value: serde_json::json!(0),
        new_value: serde_json::json!(1),
    };

    let old_tree = VNode::element("div", HashMap::new(), vec![VNode::text("0")]);
    let new_tree = VNode::element("div", HashMap::new(), vec![VNode::text("1")]);

    // Train the predictor
    for _ in 0..10 {
        predictor.learn(state_change.clone(), &old_tree, &new_tree);
    }

    c.bench_function("predictor_predict", |b| {
        b.iter(|| {
            predictor.predict(black_box(&state_change), black_box(&old_tree))
        });
    });
}

fn bench_predictor_learn(c: &mut Criterion) {
    let state_change = StateChange {
        component_id: "test".to_string(),
        state_key: "value".to_string(),
        old_value: serde_json::json!(0),
        new_value: serde_json::json!(1),
    };

    let old_tree = VNode::element("div", HashMap::new(), vec![VNode::text("0")]);
    let new_tree = VNode::element("div", HashMap::new(), vec![VNode::text("1")]);

    c.bench_function("predictor_learn", |b| {
        b.iter(|| {
            let mut predictor = Predictor::new();
            predictor.learn(
                black_box(state_change.clone()),
                black_box(&old_tree),
                black_box(&new_tree),
            );
        });
    });
}

criterion_group!(
    benches,
    bench_reconciliation_small,
    bench_reconciliation_medium,
    bench_reconciliation_large,
    bench_reconciliation_changes,
    bench_predictor,
    bench_predictor_learn,
);
criterion_main!(benches);
