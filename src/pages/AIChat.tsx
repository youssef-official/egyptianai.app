import React from "react";

function App() {
  return (
    <div className="w-screen h-screen m-0 p-0 overflow-hidden">
      <iframe
        src="https://cura-verse-ai.lovable.app/"
        title="AI Egyptian Doctor"
        className="w-full h-full border-0"
        allow="camera; microphone; geolocation"
      ></iframe>
    </div>
  );
}

export default App;
