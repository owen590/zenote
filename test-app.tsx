import React from 'react';

const TestApp: React.FC = () => {
  const handleBidirectionalSync = async () => {
    alert('同步按钮被点击了！');
  };

  return (
    <div>
      <h1>Test App</h1>
      <button onClick={handleBidirectionalSync}>双向同步</button>
    </div>
  );
};

export default TestApp;