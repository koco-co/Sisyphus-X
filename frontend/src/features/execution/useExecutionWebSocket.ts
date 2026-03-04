// frontend/src/features/execution/useExecutionWebSocket.ts
import { useEffect, useRef, useState } from 'react'
import type { WSMessage, ScenarioStartedMessage, StepCompletedMessage, ExecutionCompletedMessage } from './types'

interface UseExecutionWebSocketOptions {
  onScenarioStarted?: (data: ScenarioStartedMessage) => void
  onStepCompleted?: (data: StepCompletedMessage) => void
  onExecutionCompleted?: (data: ExecutionCompletedMessage) => void
  onExecutionCancelled?: (data: WSMessage) => void
  onExecutionPaused?: (data: WSMessage) => void
  onExecutionResumed?: (data: WSMessage) => void
  onError?: (error: Event) => void
}

export function useExecutionWebSocket(
  executionId: string | null,
  options: UseExecutionWebSocketOptions = {}
) {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const optionsRef = useRef(options)
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null)

  // Keep options ref updated
  useEffect(() => {
    optionsRef.current = options
  }, [options])

  useEffect(() => {
    if (!executionId) {
      // Clean up if executionId becomes null
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      setIsConnected(false)
      return
    }

    // 构建 WebSocket URL
    const wsBaseUrl = import.meta.env.VITE_WS_BASE_URL ||
      `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`
    const wsUrl = `${wsBaseUrl}/api/v1/executions/ws/${executionId}`

    const connect = () => {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        setIsConnected(true)
        console.log(`WebSocket connected to execution ${executionId}`)
      }

      ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data)
          setLastMessage(message)
          const currentOptions = optionsRef.current

          switch (message.type) {
            case 'scenario_started':
              currentOptions.onScenarioStarted?.(message as ScenarioStartedMessage)
              break
            case 'step_completed':
              currentOptions.onStepCompleted?.(message as StepCompletedMessage)
              break
            case 'execution_completed':
              currentOptions.onExecutionCompleted?.(message as ExecutionCompletedMessage)
              break
            case 'execution_cancelled':
              currentOptions.onExecutionCancelled?.(message)
              break
            case 'execution_paused':
              currentOptions.onExecutionPaused?.(message)
              break
            case 'execution_resumed':
              currentOptions.onExecutionResumed?.(message)
              break
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        optionsRef.current.onError?.(error)
      }

      ws.onclose = () => {
        setIsConnected(false)
        console.log(`WebSocket disconnected from execution ${executionId}`)

        // 自动重连
        reconnectTimeoutRef.current = setTimeout(() => {
          connect()
        }, 3000)
      }
    }

    connect()

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      setIsConnected(false)
    }
  }, [executionId])

  const sendPing = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send('ping')
    }
  }

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setIsConnected(false)
  }

  return {
    isConnected,
    lastMessage,
    disconnect,
    sendPing,
  }
}
