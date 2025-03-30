"use client"

import type React from "react"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import Link from "@tiptap/extension-link"
import Image from "@tiptap/extension-image"
import TextAlign from "@tiptap/extension-text-align"
import Placeholder from "@tiptap/extension-placeholder"
import { useEffect, useState } from "react"
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

export default function TiptapEditor({ initialContent, onChange }: TiptapEditorProps) {
  const [isMounted, setIsMounted] = useState(false)
  const [linkUrl, setLinkUrl] = useState<string>("")
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [imageUrl, setImageUrl] = useState<string>("")
  const [showImageInput, setShowImageInput] = useState(false)

  const editor = useEditor({
    extensions: [
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

  const addLink = () => {
    if (linkUrl && editor) {
      editor.chain().focus().extendMarkRange("link").setLink({ href: linkUrl }).run()
      setLinkUrl("")
      setShowLinkInput(false)
    }
  }

  const addImage = () => {
    if (imageUrl && editor) {
      editor.chain().focus().setImage({ src: imageUrl }).run()
      setImageUrl("")
      setShowImageInput(false)
    }
  }

  if (!isMounted) {
    return null
  }

  if (!editor) {
    return null
  }

  // Custom toggle button component
  const ToggleButton = ({
    isActive,
    onClick,
    children,
  }: {
    isActive: boolean
    onClick: () => void
    children: React.ReactNode
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={`p-2 rounded-md transition-colors ${
        isActive ? "bg-gray-200 text-gray-900" : "text-gray-700 hover:bg-gray-100"
      }`}
    >
      {children}
    </button>
  )

  return (
    <div className="tiptap-editor">
      <div className="border-b p-2 bg-gray-50 flex flex-wrap gap-1 items-center">
        <ToggleButton isActive={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="h-4 w-4" />
        </ToggleButton>

        <ToggleButton isActive={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="h-4 w-4" />
        </ToggleButton>

        <ToggleButton
          isActive={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="h-4 w-4" />
        </ToggleButton>

        <ToggleButton isActive={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough className="h-4 w-4" />
        </ToggleButton>

        <ToggleButton isActive={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()}>
          <Code className="h-4 w-4" />
        </ToggleButton>

        <div className="h-6 w-px bg-gray-300 mx-1"></div>

        <ToggleButton
          isActive={editor.isActive("heading", { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          <Heading1 className="h-4 w-4" />
        </ToggleButton>

        <ToggleButton
          isActive={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="h-4 w-4" />
        </ToggleButton>

        <div className="h-6 w-px bg-gray-300 mx-1"></div>

        <ToggleButton
          isActive={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </ToggleButton>

        <ToggleButton
          isActive={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </ToggleButton>

        <div className="h-6 w-px bg-gray-300 mx-1"></div>

        <ToggleButton
          isActive={editor.isActive({ textAlign: "left" })}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
        >
          <AlignLeft className="h-4 w-4" />
        </ToggleButton>

        <ToggleButton
          isActive={editor.isActive({ textAlign: "center" })}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
        >
          <AlignCenter className="h-4 w-4" />
        </ToggleButton>

        <ToggleButton
          isActive={editor.isActive({ textAlign: "right" })}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
        >
          <AlignRight className="h-4 w-4" />
        </ToggleButton>

        <ToggleButton
          isActive={editor.isActive({ textAlign: "justify" })}
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
        >
          <AlignJustify className="h-4 w-4" />
        </ToggleButton>

        <div className="h-6 w-px bg-gray-300 mx-1"></div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowLinkInput(!showLinkInput)}
            className="p-2 rounded-md text-gray-700 hover:bg-gray-100"
          >
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
              />
              <button onClick={addLink} className="px-2 py-1 bg-blue-600 text-white rounded-md text-sm">
                Add
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => editor.chain().focus().unsetLink().run()}
          disabled={!editor.isActive("link")}
          className={`p-2 rounded-md ${
            !editor.isActive("link") ? "opacity-50 cursor-not-allowed text-gray-400" : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          <Unlink className="h-4 w-4" />
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowImageInput(!showImageInput)}
            className="p-2 rounded-md text-gray-700 hover:bg-gray-100"
          >
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

