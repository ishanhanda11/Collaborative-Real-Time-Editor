import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { Editor } from '@monaco-editor/react'
import { MonacoBinding } from "y-monaco"
import * as Y from "yjs"
import { SocketIOProvider } from "y-socket.io"
function App() {
  const editorRef = useRef(null)
  const providerRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const [users, setUsers] = useState([])
  const [isEditorReady, setIsEditorReady] = useState(false)
  const ydoc = useMemo(() => new Y.Doc(), [])
  const yText = useMemo(() => ydoc.getText("monaco"), [ydoc])
  const [username, setUsername] = useState(() => {
    return new URLSearchParams(window.location.search).get("username") || ""
  })

  const clearTypingPresence = (provider = providerRef.current) => {
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = null
    }

    provider?.awareness.setLocalStateField("user", null)
  }

  const markTypingPresence = (provider = providerRef.current) => {
    if (!provider || !username) {
      return
    }

    provider.awareness.setLocalStateField("user", { username })
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current)
    }

    typingTimeoutRef.current = window.setTimeout(() => {
      provider.awareness.setLocalStateField("user", null)
      typingTimeoutRef.current = null
    }, 5000)
  }

  const handleMount = (editor) => {
    editorRef.current = editor
    setIsEditorReady(true)
  }

  useEffect(() => {
    return () => {
      ydoc.destroy()
    }
  }, [ydoc])

  useEffect(() => {
    if (username && isEditorReady && editorRef.current) {
      const SERVER_URL = import.meta.env.VITE_SERVER_URL || window.location.origin;
      const provider = new SocketIOProvider(SERVER_URL, "monaco", ydoc, { autoConnect: true, })
      providerRef.current = provider

      const syncUsers = () => {
        const states = Array.from(provider.awareness.getStates().entries())
        setUsers(
          states
            .filter(([, state]) => state?.user?.username)
            .map(([clientId, state]) => ({
              clientId,
              username: state.user.username
            }))
        )
      }

      provider.awareness.on("change", syncUsers)

      function handleBeforeUnload() {
        clearTypingPresence(provider)
      }
      window.addEventListener("beforeunload", handleBeforeUnload)
      const typeDisposable = editorRef.current.onDidType(() => {
        markTypingPresence(provider)
      })
      const pasteDisposable = editorRef.current.onDidPaste(() => {
        markTypingPresence(provider)
      })
      const blurDisposable = editorRef.current.onDidBlurEditorText(() => {
        clearTypingPresence(provider)
      })

      const monacoBinding = new MonacoBinding(yText, editorRef.current.getModel(),
        new Set([editorRef.current]),
        provider.awareness
      )
      return () => {
        blurDisposable.dispose()
        pasteDisposable.dispose()
        typeDisposable.dispose()
        clearTypingPresence(provider)
        provider.awareness.off("change", syncUsers)
        monacoBinding.destroy()
        provider.disconnect()
        providerRef.current = null
        setUsers([])
        window.removeEventListener("beforeunload", handleBeforeUnload)
      }
    }
  }, [isEditorReady, username, ydoc, yText])


  const handleJoin = (e) => {
    e.preventDefault();
    const nextUsername = e.target.username.value.trim()
    if (!nextUsername) {
      return
    }
    setUsername(nextUsername)
    window.history.pushState({}, "", "?username=" + encodeURIComponent(nextUsername))
  }
  if (!username) {
    return <main className='h-screen w-full bg-gray-950 flex gap-4 p-4 items-center justify-center'>
      <form onSubmit={handleJoin} className='flex flex-col gap-4'>
        <input type="text" placeholder='enter your username' className='p-2 rounded-lg bg-gray-800 text-white' name='username' />
        <button className='p-2 rounded-lg bg-amber-50 text-gray-950 font-bold'>Join</button>
      </form>
    </main>
  }

  return (
    <main className="h-screen w-full bg-gray-950 flex gap-4 p-4">
      <aside className='h-full w-1/4 bg-amber-50 rounded-lg'>
        <h2 className='text-2xl font-bold p-4 border-b border-gray-300'>Users</h2>
        <ul className='p-4'>
          {users.map((user) => (
            <li key={user.clientId} className='p-2 bg-gray-800 text-white rounded mb-2'>
              {user.username}
            </li>
          ))}
        </ul>
      </aside>
      <section className='w-3/4 bg-neutral-800 rounded-lg'>
        <Editor
          height="100%"
          defaultLanguage="javascript"
          defaultValue="// some comment"
          theme='vs-dark'
          onMount={handleMount}
        />
      </section>
    </main>
  )
}

export default App
