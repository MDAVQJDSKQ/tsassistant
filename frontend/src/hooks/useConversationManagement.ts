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

  // Use refs to prevent infinite loops
  const isLoadingRef = useRef(false)
  const lastUrlIdRef = useRef<string | null>(null)

  // Load conversations on mount (only once)
  useEffect(() => {
    if (!isLoadingRef.current) {
      isLoadingRef.current = true
      loadConversations()
    }
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
    } catch (error) {
      console.error('Error creating conversation:', error)
      alert('Failed to create new conversation')
    }
  }, [createConversation])

  const handleDeleteConversation = useCallback(async (id: string) => {
    try {
      await deleteConversation(id)
    } catch (error) {
      console.error('Error deleting conversation:', error)
      alert('Failed to delete conversation')
    }
  }, [deleteConversation])

  return {
    conversations,
    activeConversationId,
    handleSelectConversation,
    handleCreateConversation,
    handleDeleteConversation
  }
} 