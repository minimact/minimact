using Minimact.AspNetCore.Core;
using Xunit;

namespace Minimact.AspNetCore.Test;

public class PatchPathAdjusterTests
{
    /// <summary>
    /// Test: No null children - path unchanged
    /// </summary>
    [Fact]
    public void VNodePathToDomPath_NoNulls_PathUnchanged()
    {
        // Arrange: <div><h1/><p/><span/></div>
        var root = new VElement("div", new Dictionary<string, string>());
        root.Children.Add(new VElement("h1", new Dictionary<string, string>()));
        root.Children.Add(new VElement("p", new Dictionary<string, string>()));
        root.Children.Add(new VElement("span", new Dictionary<string, string>()));

        var vnodePath = new[] { 2 }; // Target span at VNode index 2

        // Act
        var domPath = PatchPathAdjuster.VNodePathToDomPath(vnodePath, root);

        // Assert
        Assert.Equal(new[] { 2 }, domPath); // No adjustment needed
    }

    /// <summary>
    /// Test: Single null before target
    /// </summary>
    [Fact]
    public void VNodePathToDomPath_SingleNullBefore_PathAdjusted()
    {
        // Arrange: <div><h1/>{null}<span/></div>
        var root = new VElement("div", new Dictionary<string, string>());
        root.Children.Add(new VElement("h1", new Dictionary<string, string>()));
        root.Children.Add(null!); // Conditional not rendered
        root.Children.Add(new VElement("span", new Dictionary<string, string>()));

        var vnodePath = new[] { 2 }; // Target span at VNode index 2

        // Act
        var domPath = PatchPathAdjuster.VNodePathToDomPath(vnodePath, root);

        // Assert
        Assert.Equal(new[] { 1 }, domPath); // DOM index = 2 - 1 null = 1
    }

    /// <summary>
    /// Test: Multiple nulls before target
    /// </summary>
    [Fact]
    public void VNodePathToDomPath_MultipleNullsBefore_PathAdjusted()
    {
        // Arrange: <div><h1/>{null}{null}{null}<footer/></div>
        var root = new VElement("div", new Dictionary<string, string>());
        root.Children.Add(new VElement("h1", new Dictionary<string, string>()));
        root.Children.Add(null!); // showA && <div>A</div>
        root.Children.Add(null!); // showB && <div>B</div>
        root.Children.Add(null!); // showC && <div>C</div>
        root.Children.Add(new VElement("footer", new Dictionary<string, string>()));

        var vnodePath = new[] { 4 }; // Target footer at VNode index 4

        // Act
        var domPath = PatchPathAdjuster.VNodePathToDomPath(vnodePath, root);

        // Assert
        Assert.Equal(new[] { 1 }, domPath); // DOM index = 4 - 3 nulls = 1
    }

    /// <summary>
    /// Test: Nested path with nulls at multiple levels
    /// </summary>
    [Fact]
    public void VNodePathToDomPath_NestedNulls_PathAdjusted()
    {
        // Arrange: <div><h1/>{null}<section><p/>{null}<span/></section></div>
        var root = new VElement("div", new Dictionary<string, string>());
        root.Children.Add(new VElement("h1", new Dictionary<string, string>()));
        root.Children.Add(null!); // Conditional

        var section = new VElement("section", new Dictionary<string, string>());
        section.Children.Add(new VElement("p", new Dictionary<string, string>()));
        section.Children.Add(null!); // Nested conditional
        section.Children.Add(new VElement("span", new Dictionary<string, string>()));
        root.Children.Add(section);

        var vnodePath = new[] { 2, 2 }; // Target section[2] (span)

        // Act
        var domPath = PatchPathAdjuster.VNodePathToDomPath(vnodePath, root);

        // Assert
        Assert.Equal(new[] { 1, 1 }, domPath); // [2-1, 2-1] = [1, 1]
    }

    /// <summary>
    /// Test: Path through null throws exception
    /// </summary>
    [Fact]
    public void VNodePathToDomPath_PathThroughNull_ThrowsException()
    {
        // Arrange: <div><h1/>{null}</div>
        var root = new VElement("div", new Dictionary<string, string>());
        root.Children.Add(new VElement("h1", new Dictionary<string, string>()));
        root.Children.Add(null!);

        var vnodePath = new[] { 1, 0 }; // Try to navigate through null at index 1

        // Act & Assert
        var ex = Assert.Throws<InvalidOperationException>(() =>
            PatchPathAdjuster.VNodePathToDomPath(vnodePath, root)
        );

        Assert.Contains("encountered null", ex.Message);
    }

    /// <summary>
    /// Test: Out of bounds index throws exception
    /// </summary>
    [Fact]
    public void VNodePathToDomPath_OutOfBounds_ThrowsException()
    {
        // Arrange: <div><h1/><p/></div>
        var root = new VElement("div", new Dictionary<string, string>());
        root.Children.Add(new VElement("h1", new Dictionary<string, string>()));
        root.Children.Add(new VElement("p", new Dictionary<string, string>()));

        var vnodePath = new[] { 5 }; // Index 5 doesn't exist

        // Act & Assert
        var ex = Assert.Throws<InvalidOperationException>(() =>
            PatchPathAdjuster.VNodePathToDomPath(vnodePath, root)
        );

        Assert.Contains("out of bounds", ex.Message);
    }

    /// <summary>
    /// Test: Empty path returns empty
    /// </summary>
    [Fact]
    public void VNodePathToDomPath_EmptyPath_ReturnsEmpty()
    {
        // Arrange
        var root = new VElement("div", new Dictionary<string, string>());
        var vnodePath = Array.Empty<int>();

        // Act
        var domPath = PatchPathAdjuster.VNodePathToDomPath(vnodePath, root);

        // Assert
        Assert.Empty(domPath);
    }

    /// <summary>
    /// Test: Null path returns empty
    /// </summary>
    [Fact]
    public void VNodePathToDomPath_NullPath_ReturnsEmpty()
    {
        // Arrange
        var root = new VElement("div", new Dictionary<string, string>());
        int[]? vnodePath = null;

        // Act
        var domPath = PatchPathAdjuster.VNodePathToDomPath(vnodePath!, root);

        // Assert
        Assert.Empty(domPath);
    }

    /// <summary>
    /// Test: Fragment with nulls
    /// </summary>
    [Fact]
    public void VNodePathToDomPath_Fragment_PathAdjusted()
    {
        // Arrange: <><h1/>{null}<p/></>
        var root = new Fragment();
        root.Children.Add(new VElement("h1", new Dictionary<string, string>()));
        root.Children.Add(null!);
        root.Children.Add(new VElement("p", new Dictionary<string, string>()));

        var vnodePath = new[] { 2 }; // Target p at VNode index 2

        // Act
        var domPath = PatchPathAdjuster.VNodePathToDomPath(vnodePath, root);

        // Assert
        Assert.Equal(new[] { 1 }, domPath); // DOM index = 2 - 1 null = 1
    }

    /// <summary>
    /// Test: Real-world scenario from ProductDetailsPage
    /// Simulates: false && <div>, showDebugInfo && <div>, then price div
    /// </summary>
    [Fact]
    public void VNodePathToDomPath_ProductDetailsPageScenario_PathAdjusted()
    {
        // Arrange: Simulating the ProductDetailsPage structure
        // <div>
        //   <h1>Title</h1>
        //   {false && <div>Never renders</div>}  <!-- null -->
        //   {showDebugInfo && <div>Debug</div>}  <!-- null (initially) -->
        //   <button>Toggle</button>
        //   <div>Price: $99.99</div>  <!-- VNode index 4, should be DOM index 2 -->
        // </div>

        var root = new VElement("div", new Dictionary<string, string>());
        root.Children.Add(new VElement("h1", new Dictionary<string, string>(), "Title"));
        root.Children.Add(null!); // false && <div>
        root.Children.Add(null!); // showDebugInfo && <div>
        root.Children.Add(new VElement("button", new Dictionary<string, string>(), "Toggle"));
        root.Children.Add(new VElement("div", new Dictionary<string, string>(), "Price: $99.99"));

        var vnodePath = new[] { 4 }; // Target price div at VNode index 4

        // Act
        var domPath = PatchPathAdjuster.VNodePathToDomPath(vnodePath, root);

        // Assert
        Assert.Equal(new[] { 2 }, domPath); // DOM index = 4 - 2 nulls = 2
    }

    /// <summary>
    /// Test: AdjustPatchPath modifies Patch object
    /// </summary>
    [Fact]
    public void AdjustPatchPath_ModifiesPatchObject()
    {
        // Arrange
        var root = new VElement("div", new Dictionary<string, string>());
        root.Children.Add(new VElement("h1", new Dictionary<string, string>()));
        root.Children.Add(null!);
        root.Children.Add(new VElement("p", new Dictionary<string, string>()));

        var patch = new Patch
        {
            Type = "UpdateText",
            Path = new List<int> { 2 } // VNode path
        };

        // Act
        PatchPathAdjuster.AdjustPatchPath(patch, root);

        // Assert
        Assert.Equal(new List<int> { 1 }, patch.Path); // DOM path
    }

    /// <summary>
    /// Test: AdjustPatchPaths batch adjustment
    /// </summary>
    [Fact]
    public void AdjustPatchPaths_BatchAdjustment()
    {
        // Arrange
        var root = new VElement("div", new Dictionary<string, string>());
        root.Children.Add(new VElement("h1", new Dictionary<string, string>()));
        root.Children.Add(null!);
        root.Children.Add(new VElement("p", new Dictionary<string, string>()));
        root.Children.Add(null!);
        root.Children.Add(new VElement("span", new Dictionary<string, string>()));

        var patches = new List<Patch>
        {
            new Patch { Type = "UpdateText", Path = new List<int> { 2 } }, // p
            new Patch { Type = "UpdateText", Path = new List<int> { 4 } }  // span
        };

        // Act
        PatchPathAdjuster.AdjustPatchPaths(patches, root);

        // Assert
        Assert.Equal(new List<int> { 1 }, patches[0].Path); // p: 2 - 1 null = 1
        Assert.Equal(new List<int> { 2 }, patches[1].Path); // span: 4 - 2 nulls = 2
    }

    /// <summary>
    /// Test: Deep nesting with multiple nulls
    /// </summary>
    [Fact]
    public void VNodePathToDomPath_DeepNesting_PathAdjusted()
    {
        // Arrange: <div><section>{null}<article>{null}<p/></article></section></div>
        var root = new VElement("div", new Dictionary<string, string>());

        var section = new VElement("section", new Dictionary<string, string>());
        section.Children.Add(null!);

        var article = new VElement("article", new Dictionary<string, string>());
        article.Children.Add(null!);
        article.Children.Add(new VElement("p", new Dictionary<string, string>()));

        section.Children.Add(article);
        root.Children.Add(section);

        var vnodePath = new[] { 0, 1, 1 }; // div → section[1] → article[1] → p

        // Act
        var domPath = PatchPathAdjuster.VNodePathToDomPath(vnodePath, root);

        // Assert
        Assert.Equal(new[] { 0, 0, 0 }, domPath); // All indices adjusted
    }
}
