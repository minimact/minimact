import { Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuth } from 'E:/allocation/failsquare/visual-compiler/dist/utils/react-shim.js';
import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
const ProtectedRoute = ({
  children
}) => {
  const {
    isAuthenticated,
    isLoading
  } = useAuth();
  if (isLoading) {
    return /*#__PURE__*/_jsx("div", {
      className: "min-h-screen flex items-center justify-center",
      children: /*#__PURE__*/_jsx(Spin, {
        size: "large",
        tip: "Loading..."
      })
    });
  }
  if (!isAuthenticated) {
    return /*#__PURE__*/_jsx(Navigate, {
      to: "/login",
      replace: true
    });
  }
  return /*#__PURE__*/_jsx(_Fragment, {
    children: children
  });
};
export default ProtectedRoute;