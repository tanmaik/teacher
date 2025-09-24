import { ChatInterface } from "@/components/chat-interface"

export default function Home() {
  return (
    <div className="h-screen flex flex-col md:flex-row">
      {/* Left half - Chat Interface */}
      <div className="w-full md:w-1/2 h-1/2 md:h-full">
        <ChatInterface />
      </div>

      {/* Right half - Empty div */}
      <div className="w-full md:w-1/2 h-1/2 md:h-full bg-muted/20 border-l">
        {/* Empty space for future content */}
      </div>
    </div>
  );
}
