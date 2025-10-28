const LoadingScreen = () => {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-4 animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center animate-pulse-glow shadow-strong">
          <img src="/logo.png" alt="AI Egyptian Doctor" className="w-9 h-9" />
        </div>
        <div className="h-1 w-24 rounded bg-primary/20 overflow-hidden">
          <div className="h-full w-1/2 bg-primary animate-[pulse_1.2s_ease-in-out_infinite]" />
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
