const LoadingScreen = () => {
  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-md flex flex-col items-center justify-center z-50">
      <div className="w-20 h-20 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
      <div className="text-lg font-semibold text-foreground">Cura Verse</div>
      <div className="text-sm text-muted-foreground">جاري التحميل...</div>
    </div>
  );
};

export default LoadingScreen;
