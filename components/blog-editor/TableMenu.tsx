'use client';

import { Editor } from '@tiptap/react';
import {
  Plus,
  Minus,
  Trash2,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Grid3X3,
  Merge,
  Split,
} from 'lucide-react';

interface TableMenuProps {
  editor: Editor;
}

interface MenuButtonProps {
  onClick: () => void;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
  variant?: 'default' | 'danger';
}

const MenuButton = ({
  onClick,
  disabled = false,
  title,
  children,
  variant = 'default',
}: MenuButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`p-1.5 rounded transition-colors flex items-center gap-1 text-xs ${
      disabled
        ? 'opacity-50 cursor-not-allowed'
        : variant === 'danger'
        ? 'hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400'
        : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
    }`}
  >
    {children}
  </button>
);

const Divider = () => (
  <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
);

export const TableMenu = ({ editor }: TableMenuProps) => {
  return (
    <div className="flex flex-wrap items-center gap-1 px-3 py-2 bg-gray-100 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-1 mr-2">
        <Grid3X3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Table:</span>
      </div>

      {/* Add Column */}
      <MenuButton
        onClick={() => editor.chain().focus().addColumnBefore().run()}
        title="Add column before"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <Plus className="w-3 h-3" />
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().addColumnAfter().run()}
        title="Add column after"
      >
        <Plus className="w-3 h-3" />
        <ArrowRight className="w-3.5 h-3.5" />
      </MenuButton>

      <Divider />

      {/* Add Row */}
      <MenuButton
        onClick={() => editor.chain().focus().addRowBefore().run()}
        title="Add row before"
      >
        <ArrowUp className="w-3.5 h-3.5" />
        <Plus className="w-3 h-3" />
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().addRowAfter().run()}
        title="Add row after"
      >
        <Plus className="w-3 h-3" />
        <ArrowDown className="w-3.5 h-3.5" />
      </MenuButton>

      <Divider />

      {/* Delete Column/Row */}
      <MenuButton
        onClick={() => editor.chain().focus().deleteColumn().run()}
        title="Delete column"
        variant="danger"
      >
        <Minus className="w-3 h-3" />
        <span>Col</span>
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().deleteRow().run()}
        title="Delete row"
        variant="danger"
      >
        <Minus className="w-3 h-3" />
        <span>Row</span>
      </MenuButton>

      <Divider />

      {/* Merge/Split */}
      <MenuButton
        onClick={() => editor.chain().focus().mergeCells().run()}
        title="Merge cells"
      >
        <Merge className="w-3.5 h-3.5" />
        <span>Merge</span>
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().splitCell().run()}
        title="Split cell"
      >
        <Split className="w-3.5 h-3.5" />
        <span>Split</span>
      </MenuButton>

      <Divider />

      {/* Toggle Header */}
      <MenuButton
        onClick={() => editor.chain().focus().toggleHeaderRow().run()}
        title="Toggle header row"
      >
        <span>Header Row</span>
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().toggleHeaderColumn().run()}
        title="Toggle header column"
      >
        <span>Header Col</span>
      </MenuButton>

      <Divider />

      {/* Delete Table */}
      <MenuButton
        onClick={() => editor.chain().focus().deleteTable().run()}
        title="Delete table"
        variant="danger"
      >
        <Trash2 className="w-3.5 h-3.5" />
        <span>Delete Table</span>
      </MenuButton>
    </div>
  );
};

export default TableMenu;
