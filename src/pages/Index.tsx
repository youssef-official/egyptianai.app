import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Bell, Heart, Brain, Bone, Stethoscope } from "lucide-react";
import BottomNav from "@/components/BottomNav";

// Mock data for the new design
const specialists = [
  { name: "Neurologist", icon: <Brain className="w-8 h-8 text-primary" /> },
  { name: "Cardiologist", icon: <Heart className="w-8 h-8 text-primary" /> },
  { name: "Orthopedist", icon: <Bone className="w-8 h-8 text-primary" /> },
  { name: "Pulmonologist", icon: <Stethoscope className="w-8 h-8 text-primary" /> },
];

const Index = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-ios-light-gray pb-28">
      <div className="container mx-auto px-4 py-6 max-w-md">
        {/* New Header */}
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Hello, Siyam Ahamed!</h1>
            <p className="text-gray-500">How are you feeling today?</p>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="rounded-full">
              <Bell className="w-6 h-6 text-gray-600" />
            </Button>
            <div className="w-12 h-12 rounded-full bg-gray-200" />
          </div>
        </header>

        {/* Search Bar */}
        <div className="relative mb-8">
          <input
            type="text"
            placeholder="Search Doctor"
            className="w-full h-12 px-4 pr-12 text-lg bg-white border-0 rounded-xl shadow-md focus:ring-2 focus:ring-primary focus:outline-none"
          />
        </div>

        {/* Specialist Categories */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Specialists</h2>
            <Button variant="link" className="text-primary">See All</Button>
          </div>
          <div className="grid grid-cols-4 gap-4">
            {specialists.map((specialist) => (
              <Card
                key={specialist.name}
                className="flex flex-col items-center justify-center p-4 text-center cursor-pointer bg-white rounded-xl shadow-md hover:bg-primary/10 transition-all"
              >
                {specialist.icon}
                <p className="mt-2 text-sm font-semibold text-gray-700">{specialist.name}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* Upcoming Appointment */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Upcoming Appointment</h2>
          <Card className="p-6 bg-primary text-white rounded-2xl shadow-lg">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center">
                <Stethoscope className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Dr. Jennifer Smith</h3>
                <p className="text-sm opacity-90">Orthopedic Consultation</p>
                <div className="mt-2 text-xs opacity-80">
                  <span>Wed, 7 Sep 2024</span> | <span>10:30 - 11:30 AM</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* My Recent Visit */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">My Recent Visit</h2>
            <Button variant="link" className="text-primary">See All</Button>
          </div>
          <Card className="p-4 bg-white rounded-2xl shadow-md">
            <CardContent className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gray-200" />
                <div>
                  <h3 className="text-lg font-bold">Dr. Warner</h3>
                  <p className="text-sm text-gray-500">Neurology</p>
                </div>
              </div>
              <Button>Book Now</Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Index;
