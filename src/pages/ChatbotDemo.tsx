
import React from "react";
import ChatbotWidget from "@/components/chatbot/ChatbotWidget";

const ChatbotDemo: React.FC = () => {
  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Chatbot Demo</h1>
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h2 className="text-xl font-semibold mb-4">About the Chatbot Widget</h2>
          <p className="mb-4">
            This is a demonstration of the floating chatbot widget. You can customize
            the following attributes:
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>Product name</li>
            <li>Bot name</li>
            <li>Avatar images</li>
            <li>Primary color</li>
          </ul>
          <p className="mb-4">
            The widget is designed to be easily integrated with different LLM backends.
            Currently, it's using static demo responses.
          </p>
          <p className="mb-4">
            Features:
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>Full-height chat interface</li>
            <li>Loading animation while waiting for responses</li>
            <li>Like/Dislike buttons for feedback</li>
            <li>Copy message functionality</li>
            <li>Regenerate response option</li>
            <li>Emoji picker</li>
          </ul>
        </div>
      </div>
      
      {/* The chatbot widget */}
      <ChatbotWidget 
        productName="Chatbase"
        botName="Chatbase AI Agent"
        primaryColor="#000000"
      />
    </div>
  );
};

export default ChatbotDemo;
