import React from 'react'
import { Message } from '../../stores/aiStore'
import MarkdownRenderer from './MarkdownRenderer'

interface ChatMessageProps {
  message: Message
  isStreaming?: boolean
}

const ChatMessage = React.memo(function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-lg px-4 py-2 ${
          isUser
            ? 'bg-blue-500 text-white'
            : 'bg-white text-gray-800 border border-gray-200'
        }`}
      >
        {message.screenshotData && (
          <div className="mb-2">
            <img
              src={message.screenshotData}
              alt="Screenshot"
              className="rounded max-w-full h-auto max-h-40"
            />
          </div>
        )}

        {message.type === 'text' && (
          <div className={isUser ? 'text-white' : 'text-gray-800'}>
            {isUser ? (
              <p className="whitespace-pre-wrap">{message.content}</p>
            ) : (
              <MarkdownRenderer content={message.content} />
            )}
          </div>
        )}

        {isStreaming && (
          <span className={`inline-block w-2 h-4 ml-1 animate-pulse ${isUser ? 'bg-white' : 'bg-blue-500'}`} />
        )}
      </div>
    </div>
  )
})

export default ChatMessage
