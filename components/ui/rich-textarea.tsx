"use client"

import React, { useRef, useEffect, forwardRef, useImperativeHandle } from "react"
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Minus,
} from "lucide-react"

export interface RichTextareaRef {
  insert: (text: string) => void
  focus: () => void
}

interface RichTextareaProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  id?: string
  minHeight?: number
}

export const RichTextarea = forwardRef<RichTextareaRef, RichTextareaProps>(
  function RichTextarea({ value, onChange, placeholder, id, minHeight = 260 }, ref) {
    const divRef = useRef<HTMLDivElement>(null)
    const isInternalChange = useRef(false)
    const savedRange = useRef<Range | null>(null)

    // Sync external value → innerHTML (e.g. loading a template into the editor)
    useEffect(() => {
      if (!divRef.current) return
      if (isInternalChange.current) {
        isInternalChange.current = false
        return
      }
      if (divRef.current.innerHTML !== (value || "")) {
        divRef.current.innerHTML = value || ""
      }
    }, [value])

    const syncValue = () => {
      isInternalChange.current = true
      if (divRef.current) onChange(divRef.current.innerHTML)
    }

    const saveRange = () => {
      const sel = window.getSelection()
      if (sel?.rangeCount && divRef.current?.contains(sel.anchorNode)) {
        savedRange.current = sel.getRangeAt(0).cloneRange()
      }
    }

    const restoreRange = () => {
      const sel = window.getSelection()
      if (savedRange.current && sel) {
        sel.removeAllRanges()
        sel.addRange(savedRange.current)
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const exec = (command: string, val?: any) => {
      const div = divRef.current
      if (!div) return
      div.focus()
      restoreRange()
      // execCommand is deprecated but still universally supported and fine for email editors
      // eslint-disable-next-line @typescript-eslint/no-deprecated
      document.execCommand(command, false, val)
      syncValue()
    }

    useImperativeHandle(ref, () => ({
      insert(text: string) {
        const div = divRef.current
        if (!div) return
        div.focus()
        const sel = window.getSelection()
        if (sel?.rangeCount) {
          const range = sel.getRangeAt(0)
          range.deleteContents()
          const node = document.createTextNode(text)
          range.insertNode(node)
          range.setStartAfter(node)
          range.collapse(true)
          sel.removeAllRanges()
          sel.addRange(range)
        } else {
          div.innerHTML += text
        }
        syncValue()
      },
      focus() {
        divRef.current?.focus()
      },
    }))

    const ToolBtn = ({
      onClick,
      children,
      title,
    }: {
      onClick: () => void
      children: React.ReactNode
      title: string
    }) => (
      <button
        type="button"
        title={title}
        onMouseDown={(e) => {
          e.preventDefault() // keep focus in contenteditable
          onClick()
        }}
        className="h-7 w-7 flex items-center justify-center rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
      >
        {children}
      </button>
    )

    const Sep = () => <span className="w-px h-4 bg-border mx-0.5 shrink-0" />

    const isEmpty = !value || value === "<br>" || value === "<div><br></div>" || value === "<p><br></p>"

    return (
      <div className="border border-input rounded-md overflow-hidden focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 ring-offset-background">
        {/* Toolbar */}
        <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border bg-muted/40 flex-wrap">
          <ToolBtn onClick={() => exec("bold")} title="Bold">
            <Bold className="w-3.5 h-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => exec("italic")} title="Italic">
            <Italic className="w-3.5 h-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => exec("underline")} title="Underline">
            <Underline className="w-3.5 h-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => exec("strikeThrough")} title="Strikethrough">
            <Strikethrough className="w-3.5 h-3.5" />
          </ToolBtn>
          <Sep />
          <ToolBtn onClick={() => exec("formatBlock", "H1")} title="Heading 1">
            <span className="text-[11px] font-bold leading-none">H1</span>
          </ToolBtn>
          <ToolBtn onClick={() => exec("formatBlock", "H2")} title="Heading 2">
            <span className="text-[11px] font-bold leading-none">H2</span>
          </ToolBtn>
          <ToolBtn onClick={() => exec("formatBlock", "H3")} title="Heading 3">
            <span className="text-[11px] font-bold leading-none">H3</span>
          </ToolBtn>
          <ToolBtn onClick={() => exec("formatBlock", "P")} title="Paragraph">
            <span className="text-[11px] font-medium leading-none">P</span>
          </ToolBtn>
          <Sep />
          <ToolBtn onClick={() => exec("insertUnorderedList")} title="Bullet list">
            <List className="w-3.5 h-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => exec("insertOrderedList")} title="Numbered list">
            <ListOrdered className="w-3.5 h-3.5" />
          </ToolBtn>
          <Sep />
          <ToolBtn onClick={() => exec("justifyLeft")} title="Align left">
            <AlignLeft className="w-3.5 h-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => exec("justifyCenter")} title="Align center">
            <AlignCenter className="w-3.5 h-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => exec("justifyRight")} title="Align right">
            <AlignRight className="w-3.5 h-3.5" />
          </ToolBtn>
          <Sep />
          <ToolBtn onClick={() => exec("insertHorizontalRule")} title="Horizontal rule">
            <Minus className="w-3.5 h-3.5" />
          </ToolBtn>
          <Sep />
          {/* Font size — save range before select steals focus */}
          <select
            title="Font size"
            className="h-6 text-xs border border-input rounded bg-background px-1 text-muted-foreground cursor-pointer outline-none"
            defaultValue=""
            onMouseDown={saveRange}
            onChange={(e) => {
              if (e.target.value) exec("fontSize", e.target.value)
              e.target.value = ""
            }}
          >
            <option value="" disabled>
              Size
            </option>
            <option value="1">Small</option>
            <option value="3">Normal</option>
            <option value="5">Large</option>
            <option value="7">X-Large</option>
          </select>
          {/* Font family */}
          <select
            title="Font family"
            className="h-6 text-xs border border-input rounded bg-background px-1 text-muted-foreground cursor-pointer outline-none"
            defaultValue=""
            onMouseDown={saveRange}
            onChange={(e) => {
              if (e.target.value) exec("fontName", e.target.value)
              e.target.value = ""
            }}
          >
            <option value="" disabled>
              Font
            </option>
            <option value="Arial">Arial</option>
            <option value="Georgia">Georgia</option>
            <option value="Courier New">Courier New</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Verdana">Verdana</option>
          </select>
        </div>

        {/* Editable area */}
        <div className="relative">
          {isEmpty && (
            <div className="absolute top-0 left-0 px-3 py-2.5 text-sm text-muted-foreground pointer-events-none select-none">
              {placeholder}
            </div>
          )}
          <div
            ref={divRef}
            id={id}
            contentEditable
            suppressContentEditableWarning
            onInput={syncValue}
            onBlur={saveRange}
            className="w-full text-sm px-3 py-2.5 bg-background outline-none overflow-y-auto"
            style={{ minHeight }}
          />
        </div>
      </div>
    )
  },
)

RichTextarea.displayName = "RichTextarea"
