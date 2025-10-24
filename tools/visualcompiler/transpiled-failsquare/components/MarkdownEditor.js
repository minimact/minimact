import { useRef, useEffect } from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { Editor } from '@toast-ui/react-editor';
import '@toast-ui/editor/dist/toastui-editor.css';
import { jsx as _jsx } from "react/jsx-runtime";
const MarkdownEditor = ({
  value = '',
  onChange,
  placeholder = 'Write your content here...',
  height = '400px',
  initialEditType = 'markdown'
}) => {
  const editorRef = useRef(null);
  useEffect(() => {
    if (editorRef.current) {
      const editorInstance = editorRef.current.getInstance();
      const currentValue = editorInstance.getMarkdown();

      // Only update if the value has changed to avoid cursor jumping
      if (value !== currentValue) {
        editorInstance.setMarkdown(value);
      }
    }
  }, [value]);
  const handleChange = () => {
    if (editorRef.current && onChange) {
      const editorInstance = editorRef.current.getInstance();
      const markdown = editorInstance.getMarkdown();
      onChange(markdown);
    }
  };
  return /*#__PURE__*/_jsx("div", {
    className: "markdown-editor-wrapper",
    children: /*#__PURE__*/_jsx(Editor, {
      ref: editorRef,
      initialValue: value,
      placeholder: placeholder,
      height: height,
      initialEditType: initialEditType,
      useCommandShortcut: true,
      onChange: handleChange,
      toolbarItems: [['heading', 'bold', 'italic', 'strike'], ['hr', 'quote'], ['ul', 'ol', 'task', 'indent', 'outdent'], ['table', 'link', 'code', 'codeblock']]
    })
  });
};
export default MarkdownEditor;