'use client'

import { useAtom, useSetAtom } from 'jotai'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef } from 'react'
import {
  conversationsAtom,
  activeConversationIdAtom,
  loadConversationsAtom,
  loadMessagesAtom,
  createConversationAtom,
  deleteConversationAtom
} from '@/atoms'

export function useConversationManagement() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [conversations] = useAtom(conversationsAtom)
  const [activeConversationId, setActiveConversationId] = useAtom(activeConversationIdAtom)
  
  const loadConversations = useSetAtom(loadConversationsAtom)
  const loadMessages = useSetAtom(loadMessagesAtom)
  const createConversation = useSetAtom(createConversationAtom)
  const deleteConversation = useSetAtom(deleteConversationAtom)

  // Use ref to prevent infinite loops in URL handling
  const lastUrlIdRef = useRef<string | null>(null)

  // Load conversations on mount and provide manual refresh
  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  // Periodic refresh to catch title updates
  useEffect(() => {
    const interval = setInterval(() => {
      loadConversations()
    }, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }, [loadConversations])

  // Refresh when page becomes visible (user switches back to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadConversations()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [loadConversations])

  // Listen for title updates from settings menu
  useEffect(() => {
    const handleTitlesUpdated = (event: CustomEvent) => {
      console.log('Conversation titles updated, refreshing list...', event.detail)
      loadConversations()
    }

    window.addEventListener('conversationTitlesUpdated', handleTitlesUpdated as EventListener)
    return () => window.removeEventListener('conversationTitlesUpdated', handleTitlesUpdated as EventListener)
  }, [loadConversations])

  // Manual refresh function for external use
  const refreshConversations = useCallback(() => {
    loadConversations()
  }, [loadConversations])

  // Handle URL synchronization (only when URL actually changes)
  useEffect(() => {
    const urlConversationId = searchParams.get('conv')
    
    // Only process if URL actually changed
    if (urlConversationId !== lastUrlIdRef.current) {
      lastUrlIdRef.current = urlConversationId
      
      if (urlConversationId && urlConversationId !== activeConversationId) {
        setActiveConversationId(urlConversationId)
        // Always load messages when switching conversations
        loadMessages(urlConversationId)
      }
    }
  }, [searchParams, activeConversationId, setActiveConversationId, loadMessages])

  // Load messages when active conversation changes (but not from URL)
  useEffect(() => {
    if (activeConversationId && lastUrlIdRef.current !== activeConversationId) {
      loadMessages(activeConversationId)
    }
  }, [activeConversationId, loadMessages])

  // Update URL when active conversation changes (but prevent loops)
  useEffect(() => {
    const currentUrlId = searchParams.get('conv')
    
    // Only update URL if it's different and we're not already processing a URL change
    if (activeConversationId && 
        currentUrlId !== activeConversationId && 
        lastUrlIdRef.current !== activeConversationId) {
      router.push(`?conv=${activeConversationId}`, { scroll: false })
    } else if (!activeConversationId && currentUrlId) {
      router.push('/simple-chatbot', { scroll: false })
    }
  }, [activeConversationId, router, searchParams])

  const handleSelectConversation = useCallback((id: string) => {
    if (id !== activeConversationId) {
      setActiveConversationId(id)
      loadMessages(id)
    }
  }, [activeConversationId, setActiveConversationId, loadMessages])

  const handleCreateConversation = useCallback(async () => {
    try {
      await createConversation()
      // Refresh conversation list after creating
      setTimeout(() => refreshConversations(), 500)
    } catch (error) {
      console.error('Error creating conversation:', error)
      alert('Failed to create new conversation')
    }
  }, [createConversation, refreshConversations])

  const handleDeleteConversation = useCallback(async (id: string) => {
    try {
      await deleteConversation(id)
      // Refresh conversation list after deleting
      setTimeout(() => refreshConversations(), 500)
    } catch (error) {
      console.error('Error deleting conversation:', error)
      alert('Failed to delete conversation')
    }
  }, [deleteConversation, refreshConversations])

  return {
    conversations,
    activeConversationId,
    handleSelectConversation,
    handleCreateConversation,
    handleDeleteConversation,
    refreshConversations
  }
} 