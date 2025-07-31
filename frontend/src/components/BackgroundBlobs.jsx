// frontend/src/components/BackgroundBlobs.jsx
import React from 'react';

const BackgroundBlobs = () => (
  <>
    <div className="blob absolute -top-10 -left-20 w-[400px] h-[400px] bg-blue-500 opacity-40" style={{ animation: 'move 35s infinite alternate' }}></div>
    <div className="blob absolute bottom-0 -right-20 w-[500px] h-[500px] bg-purple-600 opacity-50" style={{ animation: 'move 40s infinite alternate-reverse' }}></div>
    <div className="blob absolute top-1/2 left-1/3 w-[300px] h-[300px] bg-teal-400 opacity-30" style={{ animation: 'move 28s infinite alternate' }}></div>
  </>
);

export default BackgroundBlobs;