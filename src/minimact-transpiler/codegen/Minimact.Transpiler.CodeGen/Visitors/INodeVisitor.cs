using Minimact.Transpiler.CodeGen.Nodes;

namespace Minimact.Transpiler.CodeGen.Visitors;

/// <summary>
/// Visitor interface for traversing the JSON AST
/// </summary>
public interface INodeVisitor
{
    void Visit(ComponentNode node);
    void Visit(RenderMethodNode node);
    void Visit(JSXElementNode node);
    void Visit(TextTemplateNode node);
    void Visit(StaticTextNode node);
    void Visit(AttributeTemplateNode node);
    void Visit(LoopTemplateNode node);
    void Visit(ConditionalTemplateNode node);
}
