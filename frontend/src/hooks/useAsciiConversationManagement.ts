'use client'

import { useAtom, useSetAtom } from 'jotai'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef } from 'react'
import {
  asciiConversationsAtom,
  activeAsciiConversationIdAtom,
  loadAsciiConversationsAtom,
  loadAsciiMessagesAtom,
  createAsciiConversationAtom,
  deleteAsciiConversationAtom
} from '@/atoms'

export function useAsciiConversationManagement() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [conversations] = useAtom(asciiConversationsAtom)
  const [activeConversationId, setActiveConversationId] = useAtom(activeAsciiConversationIdAtom)
  
  const loadConversations = useSetAtom(loadAsciiConversationsAtom)
  const loadMessages = useSetAtom(loadAsciiMessagesAtom)
  const createConversation = useSetAtom(createAsciiConversationAtom)
  const deleteConversation = useSetAtom(deleteAsciiConversationAtom)

  // Use refs to prevent infinite loops
  const isLoadingRef = useRef(false)
  const lastUrlIdRef = useRef<string | null>(null)

  // Load ASCII conversations on mount (only once)
  useEffect(() => {
    if (!isLoadingRef.current) {
      isLoadingRef.current = true
      loadConversations()
    }
  }, [loadConversations])

  // Handle URL synchronization for ASCII conversations (only when URL actually changes)
  useEffect(() => {
    const urlConversationId = searchParams.get('ascii-conv')
    
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

  // Update URL when active ASCII conversation changes
  useEffect(() => {
    const currentUrlId = searchParams.get('ascii-conv')
    if (activeConversationId && currentUrlId !== activeConversationId) {
      router.push(`/ascii-generator?ascii-conv=${activeConversationId}`, { scroll: false })
    } else if (!activeConversationId && currentUrlId) {
      router.push('/ascii-generator', { scroll: false })
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
      console.error('Error creating ASCII conversation:', error)
      alert('Failed to create new ASCII conversation')
    }
  }, [createConversation])

  const handleDeleteConversation = useCallback(async (id: string) => {
    try {
      await deleteConversation(id)
    } catch (error) {
      console.error('Error deleting ASCII conversation:', error)
      alert('Failed to delete ASCII conversation')
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