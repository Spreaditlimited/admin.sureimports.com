"use client"

import type React from "react"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import Link from "@tiptap/extension-link"
import Image from "@tiptap/extension-image"
import TextAlign from "@tiptap/extension-text-align"
import Placeholder from "@tiptap/extension-placeholder"
import { useEffect, useState, useCallback, memo } from "react"
import {
  Bold,
  Italic,
  UnderlineIcon,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  LinkIcon,
  Unlink,
  ImageIcon,
} from "lucide-react"

interface TiptapEditorProps {
  initialContent: string
  onChange: (html: string) => void
}

// Memoized button component for better performance
const EditorButton = memo(
  ({
    isActive,
    onClick,
    icon: Icon,
    disabled = false,
  }: {
    isActive: boolean
    onClick: (e: React.MouseEvent) => void
    icon: React.ElementType
    disabled?: boolean
  }) => (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault() // Prevent focus loss
        onClick(e)
      }}
      disabled={disabled}
      className={`p-2 rounded-md transition-colors ${
        isActive ? "bg-gray-200 text-gray-900" : "text-gray-700 hover:bg-gray-100"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <Icon className="h-4 w-4" />
    </button>
  ),
)

EditorButton.displayName = "EditorButton"

// Memoized divider component
const Divider = memo(() => <div className="h-6 w-px bg-gray-300 mx-1"></div>)

Divider.displayName = "Divider"

export default function TiptapEditor({ initialContent, onChange }: TiptapEditorProps) {
  const [isMounted, setIsMounted] = useState(false)
  const [linkUrl, setLinkUrl] = useState<string>("")
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [imageUrl, setImageUrl] = useState<string>("")
  const [showImageInput, setShowImageInput] = useState(false)

  // Optimize editor initialization with proper extension configuration
  const editor = useEditor({
    extensions: [
      // Use default StarterKit without disabling any features
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: false,
      }),
      Image,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Placeholder.configure({
        placeholder: "Write your content here...",
      }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: "prose prose-sm sm:prose max-w-none focus:outline-none p-4 min-h-[200px]",
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })

  // Handle client-side only rendering
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Improved command handlers that properly handle text selection
  const toggleBold = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      editor?.chain().focus().toggleBold().run()
    },
    [editor],
  )

  const toggleItalic = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      editor?.chain().focus().toggleItalic().run()
    },
    [editor],
  )

  const toggleUnderline = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      editor?.chain().focus().toggleUnderline().run()
    },
    [editor],
  )

  const toggleStrike = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      editor?.chain().focus().toggleStrike().run()
    },
    [editor],
  )

  const toggleCode = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      editor?.chain().focus().toggleCode().run()
    },
    [editor],
  )

  const toggleH1 = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      editor?.chain().focus().toggleHeading({ level: 1 }).run()
    },
    [editor],
  )

  const toggleH2 = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      editor?.chain().focus().toggleHeading({ level: 2 }).run()
    },
    [editor],
  )

  // Fixed list commands to properly handle text selection
  const toggleBulletList = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      if (editor) {
        // Ensure we're focused and the command runs properly
        editor.chain().focus().toggleBulletList().run()
      }
    },
    [editor],
  )

  const toggleOrderedList = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      if (editor) {
        // Ensure we're focused and the command runs properly
        editor.chain().focus().toggleOrderedList().run()
      }
    },
    [editor],
  )

  const alignLeft = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      editor?.chain().focus().setTextAlign("left").run()
    },
    [editor],
  )

  const alignCenter = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      editor?.chain().focus().setTextAlign("center").run()
    },
    [editor],
  )

  const alignRight = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      editor?.chain().focus().setTextAlign("right").run()
    },
    [editor],
  )

  const alignJustify = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      editor?.chain().focus().setTextAlign("justify").run()
    },
    [editor],
  )

  // Memoize handlers to prevent recreating functions on each render
  const addLink = useCallback(() => {
    if (linkUrl && editor) {
      editor.chain().focus().extendMarkRange("link").setLink({ href: linkUrl }).run()
      setLinkUrl("")
      setShowLinkInput(false)
    }
  }, [linkUrl, editor])

  const unsetLink = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      editor?.chain().focus().unsetLink().run()
    },
    [editor],
  )

  const addImage = useCallback(() => {
    if (imageUrl && editor) {
      editor.chain().focus().setImage({ src: imageUrl }).run()
      setImageUrl("")
      setShowImageInput(false)
    }
  }, [imageUrl, editor])

  const toggleLinkInput = useCallback(() => {
    setShowLinkInput((prev) => !prev)
  }, [])

  const toggleImageInput = useCallback(() => {
    setShowImageInput((prev) => !prev)
  }, [])

  if (!isMounted) {
    return null
  }

  if (!editor) {
    return null
  }

  // Debug function to help diagnose issues
  const debugCommand = (name: string) => {
    console.log(`${name} active:`, editor.isActive(name))
    //console.log(`Can execute ${name}:`, editor.can().chain().focus()[`toggle${name}`]().run())
  }

  return (
    <div className="tiptap-editor">
      <div className="border-b p-2 bg-gray-50 flex flex-wrap gap-1 items-center">
        <EditorButton isActive={editor.isActive("bold")} onClick={toggleBold} icon={Bold} />
        <EditorButton isActive={editor.isActive("italic")} onClick={toggleItalic} icon={Italic} />
        <EditorButton isActive={editor.isActive("underline")} onClick={toggleUnderline} icon={UnderlineIcon} />
        <EditorButton isActive={editor.isActive("strike")} onClick={toggleStrike} icon={Strikethrough} />
        <EditorButton isActive={editor.isActive("code")} onClick={toggleCode} icon={Code} />

        <Divider />

        <EditorButton isActive={editor.isActive("heading", { level: 1 })} onClick={toggleH1} icon={Heading1} />
        <EditorButton isActive={editor.isActive("heading", { level: 2 })} onClick={toggleH2} icon={Heading2} />

        <Divider />

        {/* Direct button implementation for lists to ensure they work with selections */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault()
            editor.chain().focus().toggleBulletList().run()
          }}
          className={`p-2 rounded-md transition-colors ${
            editor.isActive("bulletList") ? "bg-gray-200 text-gray-900" : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          <List className="h-4 w-4" />
        </button>

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault()
            editor.chain().focus().toggleOrderedList().run()
          }}
          className={`p-2 rounded-md transition-colors ${
            editor.isActive("orderedList") ? "bg-gray-200 text-gray-900" : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          <ListOrdered className="h-4 w-4" />
        </button>

        <Divider />

        <EditorButton isActive={editor.isActive({ textAlign: "left" })} onClick={alignLeft} icon={AlignLeft} />
        <EditorButton isActive={editor.isActive({ textAlign: "center" })} onClick={alignCenter} icon={AlignCenter} />
        <EditorButton isActive={editor.isActive({ textAlign: "right" })} onClick={alignRight} icon={AlignRight} />
        <EditorButton isActive={editor.isActive({ textAlign: "justify" })} onClick={alignJustify} icon={AlignJustify} />

        <Divider />

        <div className="relative">
          <button type="button" onClick={toggleLinkInput} className="p-2 rounded-md text-gray-700 hover:bg-gray-100">
            <LinkIcon className="h-4 w-4" />
          </button>

          {showLinkInput && (
            <div className="absolute z-10 mt-2 p-2 bg-white border rounded-md shadow-lg flex items-center gap-2">
              <input
                type="text"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                className="px-2 py-1 border rounded-md text-sm"
                autoFocus
              />
              <button onClick={addLink} className="px-2 py-1 bg-blue-600 text-white rounded-md text-sm">
                Add
              </button>
            </div>
          )}
        </div>

        <EditorButton isActive={false} onClick={unsetLink} icon={Unlink} disabled={!editor.isActive("link")} />

        <div className="relative">
          <button type="button" onClick={toggleImageInput} className="p-2 rounded-md text-gray-700 hover:bg-gray-100">
            <ImageIcon className="h-4 w-4" />
          </button>

          {showImageInput && (
            <div className="absolute z-10 mt-2 p-2 bg-white border rounded-md shadow-lg flex items-center gap-2">
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="px-2 py-1 border rounded-md text-sm"
                autoFocus
              />
              <button onClick={addImage} className="px-2 py-1 bg-blue-600 text-white rounded-md text-sm">
                Add
              </button>
            </div>
          )}
        </div>
      </div>

      <EditorContent editor={editor} />
    </div>
  )
}

