import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Image from '@tiptap/extension-image';
import Youtube from '@tiptap/extension-youtube';
import Placeholder from '@tiptap/extension-placeholder';
import {
    Bold, Italic, Underline as UnderlineIcon, List, ListOrdered,
    Heading2, ImageIcon, YoutubeIcon, Quote, Minus,
} from 'lucide-react';
import { useEffect, useRef } from 'react';

interface RichTextEditorProps {
    value: string;
    onChange: (html: string) => void;
    placeholder?: string;
    onImageUpload?: (file: File) => Promise<string>;
    minHeight?: string;
}

export function RichTextEditor({ value, onChange, placeholder, onImageUpload, minHeight = '120px' }: RichTextEditorProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [2, 3] },
            }),
            Underline,
            Image.configure({
                HTMLAttributes: {
                    class: 'rounded-xl max-w-full mx-auto block my-4',
                },
            }),
            Youtube.configure({
                HTMLAttributes: {
                    class: 'rounded-xl overflow-hidden my-4',
                },
                width: 640,
                height: 360,
            }),
            Placeholder.configure({
                placeholder: placeholder || 'Start writing...',
            }),
        ],
        content: value,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: `prose prose-sm sm:prose max-w-none px-4 py-3 outline-none focus:outline-none`,
                style: `min-height: ${minHeight}`,
            },
        },
    });

    useEffect(() => {
        if (editor && value !== editor.getHTML()) {
            editor.commands.setContent(value);
        }
    }, [value, editor]);

    const handleImageClick = () => {
        if (fileInputRef.current) fileInputRef.current.click();
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !editor) return;
        e.target.value = '';

        if (onImageUpload) {
            try {
                const url = await onImageUpload(file);
                editor.chain().focus().setImage({ src: url }).run();
            } catch (err) {
                console.error('Image upload failed:', err);
                alert('Failed to upload image. Please try again.');
            }
        } else {
            // Fallback: use local data URL (not recommended for production)
            const reader = new FileReader();
            reader.onload = () => {
                editor.chain().focus().setImage({ src: reader.result as string }).run();
            };
            reader.readAsDataURL(file);
        }
    };

    const handleYouTube = () => {
        if (!editor) return;
        const url = prompt('Paste the YouTube video URL:');
        if (url) {
            editor.commands.setYoutubeVideo({ src: url });
        }
    };

    if (!editor) return null;

    const btnClass = (active: boolean) =>
        `p-1.5 rounded-lg transition-colors ${active ? 'bg-blue-100 text-blue-700' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`;

    return (
        <div className="border border-slate-200 rounded-xl overflow-hidden focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all">
            {/* Toolbar */}
            <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-slate-100 bg-slate-50/50 flex-wrap">
                <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={btnClass(editor.isActive('bold'))} title="Bold">
                    <Bold className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={btnClass(editor.isActive('italic'))} title="Italic">
                    <Italic className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={btnClass(editor.isActive('underline'))} title="Underline">
                    <UnderlineIcon className="w-4 h-4" />
                </button>
                <div className="w-px h-5 bg-slate-200 mx-1" />
                <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={btnClass(editor.isActive('heading', { level: 2 }))} title="Heading">
                    <Heading2 className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={btnClass(editor.isActive('bulletList'))} title="Bullet List">
                    <List className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btnClass(editor.isActive('orderedList'))} title="Numbered List">
                    <ListOrdered className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={btnClass(editor.isActive('blockquote'))} title="Blockquote">
                    <Quote className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => editor.chain().focus().setHorizontalRule().run()} className={btnClass(false)} title="Divider">
                    <Minus className="w-4 h-4" />
                </button>
                <div className="w-px h-5 bg-slate-200 mx-1" />
                <button type="button" onClick={handleImageClick} className={btnClass(false)} title="Insert Image">
                    <ImageIcon className="w-4 h-4" />
                </button>
                <button type="button" onClick={handleYouTube} className={btnClass(false)} title="Embed YouTube Video">
                    <YoutubeIcon className="w-4 h-4" />
                </button>
            </div>
            {/* Editor */}
            <EditorContent editor={editor} />
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
        </div>
    );
}
