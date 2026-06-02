import React, { useRef, useState, useEffect } from 'react';
import { 
  Undo, 
  Redo, 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  AlignJustify, 
  List, 
  ListOrdered, 
  Link as LinkIcon, 
  Table as TableIcon, 
  Image as ImageIcon, 
  Quote, 
  Code, 
  Type, 
  Palette, 
  CloudCheck, 
  CloudUpload, 
  Heading
} from 'lucide-react';

interface RichTextEditorProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ id, value, onChange, placeholder = "Type theoretical notes..." }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<any>(null);
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'idle'>('saved');
  
  // Modals / Dropdowns States
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showBgColorPicker, setShowBgColorPicker] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showTableModal, setShowTableModal] = useState(false);
  const [showMediaModal, setShowMediaModal] = useState(false);
  
  // Link Modal Fields
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [linkInNewTab, setLinkInNewTab] = useState(true);

  // Table Modal Fields
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [tableHasHeader, setTableHasHeader] = useState(true);

  // Media Modal Fields
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [mediaCaption, setMediaCaption] = useState('');

  // Active state tracks of the currently selected/cursor text attributes
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikeThrough: false,
    alignLeft: true,
    alignCenter: false,
    alignRight: false,
    alignJustify: false,
    listBullet: false,
    listOrdered: false,
    heading: '<p>',
    fontSize: '3',
    foreColor: '#000000',
    hiliteColor: '#ffffff',
    blockquote: false,
    codeBlock: false,
  });

  // Calculate active states for toolbar buttons based on current selection
  const updateActiveStates = () => {
    if (!editorRef.current) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    try {
      const range = selection.getRangeAt(0);
      const container = range.commonAncestorContainer;
      const isInsideEditor = editorRef.current.contains(container);

      // Avoid clearing/updating states if user clicked outside the editor (e.g. into dialog/sidebar)
      if (!isInsideEditor) return;

      const bold = document.queryCommandState('bold');
      const italic = document.queryCommandState('italic');
      const underline = document.queryCommandState('underline');
      const strikeThrough = document.queryCommandState('strikeThrough');

      const alignLeft = document.queryCommandState('justifyLeft');
      const alignCenter = document.queryCommandState('justifyCenter');
      const alignRight = document.queryCommandState('justifyRight');
      const alignJustify = document.queryCommandState('justifyFull');

      const listBullet = document.queryCommandState('insertUnorderedList');
      const listOrdered = document.queryCommandState('insertOrderedList');

      let headingVal = 'p';
      let blockquote = false;
      let codeBlock = false;

      // Walk up the node tree to find structural wrappers like headings, blockquotes or pre-formatted code blocks
      let node: Node | null = container;
      while (node && node !== editorRef.current) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as HTMLElement;
          const tagName = el.tagName.toLowerCase();
          if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p'].includes(tagName)) {
            headingVal = tagName;
          }
          if (tagName === 'blockquote') {
            blockquote = true;
          }
          if (tagName === 'pre') {
            codeBlock = true;
          }
        }
        node = node.parentNode;
      }

      // Read modern size and colors
      let fontSize = '3';
      try {
        fontSize = document.queryCommandValue('fontSize') || '3';
      } catch {
        fontSize = '3';
      }

      let foreColor = '#000000';
      try {
        foreColor = document.queryCommandValue('foreColor') || '#000000';
      } catch {
        foreColor = '#000000';
      }

      let hiliteColor = '#ffffff';
      try {
        hiliteColor = document.queryCommandValue('hiliteColor') || document.queryCommandValue('backColor') || '#ffffff';
      } catch {
        hiliteColor = '#ffffff';
      }

      setActiveFormats({
        bold,
        italic,
        underline,
        strikeThrough,
        alignLeft: alignLeft || (!alignCenter && !alignRight && !alignJustify),
        alignCenter,
        alignRight,
        alignJustify,
        listBullet,
        listOrdered,
        heading: `<${headingVal}>`,
        fontSize,
        foreColor,
        hiliteColor,
        blockquote,
        codeBlock,
      });
    } catch (err) {
      console.debug('Failed to query command states:', err);
    }
  };

  // Sync prop value only when it originates from an external source (such as switching lessons)
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  // Clean up debounced timeout and registers event listeners
  useEffect(() => {
    const handleSelectionChange = () => {
      updateActiveStates();
    };

    document.addEventListener('selectionchange', handleSelectionChange);

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Synchronize internal text or HTML modifications and store change debounced by 3 seconds
  const handleContentChange = () => {
    if (editorRef.current) {
      const content = editorRef.current.innerHTML;
      
      // Update intermediate save status to indicate typing/saving in progress
      setSaveState('saving');
      
      // Debounce saving: clear previous timeout and register a new one for 3 seconds of inactivity
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        onChange(content);
        setSaveState('saved');
      }, 3000);

      // Revise tools selection active states
      updateActiveStates();
    }
  };

  // Focus helper
  const focusEditor = () => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  // Commands wrapper
  const executeCmd = (command: string, value: string = '') => {
    focusEditor();
    document.execCommand(command, false, value);
    handleContentChange();
    // Schedule a small state query wait to ensure DOM and selection have resolved
    setTimeout(updateActiveStates, 10);
  };

  // Helper to compile CSS layout class strings for toolbar options with smooth hover or pressed style cues
  const getBtnClass = (isActive: boolean, extraClasses = '') => {
    return `p-1.5 rounded-md transition duration-150 ease-in-out cursor-pointer border ${
      isActive 
        ? 'bg-pink-100 text-pink-700 font-extrabold border-pink-300 shadow-3xs' 
        : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900 border-transparent'
    } ${extraClasses}`;
  };

  // Dropdown list commands
  const handleHeadingChange = (tag: string) => {
    executeCmd('formatBlock', tag);
  };

  const handleFontSizeChange = (size: string) => {
    // execCommand fontSize accepts 1-7 (1=10px, 2=13px, 3=16px, 4=18px, 5=24px, 6=32px, 7=48px)
    executeCmd('fontSize', size);
  };

  // Color presetter palettes
  const textColors = [
    '#000000', '#475569', '#dc2626', '#ea580c', '#ca8a04', 
    '#16a34a', '#0d9488', '#2563eb', '#4f46e5', '#9333ea', '#db2777'
  ];

  const bgColors = [
    '#ffffff', '#f1f5f9', '#fee2e2', '#ffedd5', '#fef9c3', 
    '#dcfce7', '#ccfbf1', '#dbeafe', '#e0e7ff', '#f3e8ff', '#fce7f3'
  ];

  // Insert Link Action
  const handleInsertLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkUrl) return;
    
    focusEditor();
    
    // If text search fails or no selection exists, use the custom text
    const selection = window.getSelection();
    const selectedText = selection ? selection.toString() : '';
    
    if (selectedText.length === 0 && linkText) {
      // Insert HTML link direct node
      const linkHtml = `<a href="${linkUrl}" target="${linkInNewTab ? '_blank' : '_self'}" class="text-indigo-600 hover:underline font-semibold" rel="noreferrer">${linkText}</a>`;
      executeCmd('insertHTML', linkHtml);
    } else {
      // Direct execute link command on selection
      executeCmd('createLink', linkUrl);
    }

    setLinkUrl('');
    setLinkText('');
    setShowLinkModal(false);
  };

  // Insert Table Action
  const handleInsertTable = (e: React.FormEvent) => {
    e.preventDefault();
    focusEditor();

    let tableHtml = `<table class="w-full text-xs border-collapse border border-slate-200 rounded-lg overflow-hidden my-4">`;
    
    if (tableHasHeader) {
      tableHtml += `<thead><tr class="bg-slate-100">`;
      for (let c = 0; c < tableCols; c++) {
        tableHtml += `<th class="border border-slate-200 px-3 py-2 text-left font-bold text-slate-700">Header ${c + 1}</th>`;
      }
      tableHtml += `</tr></thead>`;
    }

    tableHtml += `<tbody>`;
    for (let r = 0; r < tableRows; r++) {
      tableHtml += `<tr>`;
      for (let c = 0; c < tableCols; c++) {
        tableHtml += `<td class="border border-slate-200 px-3 py-2 text-slate-600">Cell data</td>`;
      }
      tableHtml += `</tr>`;
    }
    tableHtml += `</tbody></table><p>&nbsp;</p>`;

    executeCmd('insertHTML', tableHtml);
    setShowTableModal(false);
  };

  // Insert Image/Media Link
  const handleInsertMedia = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaUrl) return;

    focusEditor();

    if (mediaType === 'image') {
      const imgHtml = `
        <figure class="my-4 inline-block max-w-full text-center font-sans">
          <img src="${mediaUrl}" alt="${mediaCaption || 'Media Asset'}" class="max-w-full rounded-xl border border-slate-200 shadow-sm" referrerPolicy="no-referrer" />
          ${mediaCaption ? `<figcaption class="text-[11px] text-slate-400 italic mt-1 font-sans">${mediaCaption}</figcaption>` : ''}
        </figure>
        <p>&nbsp;</p>
      `;
      executeCmd('insertHTML', imgHtml);
    } else {
      // Generate clean iframe component (e.g. YouTube parse link)
      let embedLink = mediaUrl;
      if (mediaUrl.includes('youtube.com/watch?v=')) {
        const idStr = mediaUrl.split('v=')[1]?.split('&')[0];
        embedLink = `https://www.youtube.com/embed/${idStr}`;
      } else if (mediaUrl.includes('youtu.be/')) {
        const idStr = mediaUrl.split('youtu.be/')[1]?.split('?')[0];
        embedLink = `https://www.youtube.com/embed/${idStr}`;
      }

      const iframeHtml = `
        <div class="my-4 aspect-video rounded-xl overflow-hidden border border-slate-200 shadow-md">
          <iframe src="${embedLink}" class="w-full h-full" frameborder="0" allowfullscreen></iframe>
        </div>
        ${mediaCaption ? `<p class="text-center text-[11px] text-slate-400 italic mt-1 font-sans">${mediaCaption}</p>` : ''}
        <p>&nbsp;</p>
      `;
      executeCmd('insertHTML', iframeHtml);
    }

    setMediaUrl('');
    setMediaCaption('');
    setShowMediaModal(false);
  };

  // Blockquote custom implementation
  const handleBlockquote = () => {
    executeCmd('formatBlock', '<blockquote>');
  };

  // Pre-code block toggle
  const handleCodeBlock = () => {
    executeCmd('formatBlock', '<pre>');
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    // Keep pasting simple and reliable, standard browser behavior is sanitized inside sandboxes
  };

  return (
    <div id={id || "rich-text-editor-container"} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs focus-within:ring-2 focus-within:ring-pink-100 focus-within:border-pink-500 transition-all flex flex-col">
      {/* Dynamic Toolbar */}
      <div className="bg-slate-50 border-b border-slate-200 p-2.5 flex flex-wrap items-center justify-between gap-2.5 select-none shrink-0 font-sans">
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Working Toolbar buttons (Fully WYSIWYG) */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Undo / Redo */}
            <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg p-0.5 shadow-3xs">
              <button
                type="button"
                onClick={() => executeCmd('undo')}
                className="p-1.5 hover:bg-slate-100 rounded-md text-slate-600 transition cursor-pointer"
                title="Undo (Ctrl+Z)"
              >
                <Undo className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => executeCmd('redo')}
                className="p-1.5 hover:bg-slate-100 rounded-md text-slate-600 transition cursor-pointer"
                title="Redo (Ctrl+Y)"
              >
                <Redo className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Bold Italic Underline Strikethrough */}
            <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg p-0.5 shadow-3xs">
              <button
                type="button"
                onClick={() => executeCmd('bold')}
                className={getBtnClass(activeFormats.bold)}
                title="Bold (Ctrl+B)"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => executeCmd('italic')}
                className={getBtnClass(activeFormats.italic, 'italic')}
                title="Italic (Ctrl+I)"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => executeCmd('underline')}
                className={getBtnClass(activeFormats.underline, 'underline underline-offset-2')}
                title="Underline (Ctrl+U)"
              >
                <Underline className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => executeCmd('strikeThrough')}
                className={getBtnClass(activeFormats.strikeThrough, 'line-through')}
                title="Strikethrough"
              >
                <Strikethrough className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Structuring Blocks Selector Dropdown */}
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-0.5 shadow-3xs">
              <Heading className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <select
                aria-label="Paragraph blocks structure format"
                onChange={(e) => handleHeadingChange(e.target.value)}
                value={activeFormats.heading}
                className="text-xs bg-transparent focus:outline-none text-slate-700 font-bold cursor-pointer max-w-[90px] sm:max-w-none"
              >
                <option value="<p>">Normal Text</option>
                <option value="<h1>">Header 1</option>
                <option value="<h2>">Header 2</option>
                <option value="<h3>">Header 3</option>
                <option value="<h4>">Header 4</option>
                <option value="<h5>">Header 5</option>
                <option value="<h6>">Header 6</option>
              </select>
            </div>

            {/* Font Size Selector Dropdown */}
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-0.5 shadow-3xs">
              <Type className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <select
                aria-label="Text Font Size Scale format"
                onChange={(e) => handleFontSizeChange(e.target.value)}
                value={activeFormats.fontSize}
                className="text-xs bg-transparent focus:outline-none text-slate-700 font-bold cursor-pointer"
              >
                <option value="1">Smallest (10px)</option>
                <option value="2">Small (13px)</option>
                <option value="3">Normal (16px)</option>
                <option value="4">Subtitle (18px)</option>
                <option value="5">Subheading (24px)</option>
                <option value="6">Large Title (32px)</option>
                <option value="7">Display (48px)</option>
              </select>
            </div>

            {/* Text Alignments */}
            <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg p-0.5 shadow-3xs">
              <button
                type="button"
                onClick={() => executeCmd('justifyLeft')}
                className={getBtnClass(activeFormats.alignLeft)}
                title="Align Left"
              >
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => executeCmd('justifyCenter')}
                className={getBtnClass(activeFormats.alignCenter)}
                title="Align Center"
              >
                <AlignCenter className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => executeCmd('justifyRight')}
                className={getBtnClass(activeFormats.alignRight)}
                title="Align Right"
              >
                <AlignRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => executeCmd('justifyFull')}
                className={getBtnClass(activeFormats.alignJustify)}
                title="Justify"
              >
                <AlignJustify className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Lists Ordered & Unordered */}
            <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg p-0.5 shadow-3xs">
              <button
                type="button"
                onClick={() => executeCmd('insertUnorderedList')}
                className={getBtnClass(activeFormats.listBullet)}
                title="Unordered List (Bullets)"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => executeCmd('insertOrderedList')}
                className={getBtnClass(activeFormats.listOrdered)}
                title="Ordered List (Numbered)"
              >
                <ListOrdered className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Color pickers controls */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowColorPicker(!showColorPicker);
                  setShowBgColorPicker(false);
                }}
                className={`p-1.5 hover:bg-slate-100 border rounded-lg shadow-3xs text-xs font-semibold flex items-center gap-1 transition duration-150 ease-in-out cursor-pointer ${
                  showColorPicker ? 'bg-pink-50 border-pink-300' : 'bg-white border-slate-200'
                }`}
                title="Text Color"
              >
                <Palette 
                  className="w-3.5 h-3.5" 
                  style={{ 
                    color: activeFormats.foreColor && activeFormats.foreColor !== '#000000' && activeFormats.foreColor !== 'rgb(0, 0, 0)' 
                      ? activeFormats.foreColor 
                      : '#dc2626' 
                  }} 
                />
                <span className="hidden md:inline text-slate-700">Color</span>
              </button>
              
              {showColorPicker && (
                <div className="absolute left-0 mt-1.5 z-40 bg-white border border-slate-200 rounded-xl shadow-lg p-3 grid grid-cols-4 gap-1.5 w-40 animate-scale-in">
                  {textColors.map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => {
                        executeCmd('foreColor', col);
                        setShowColorPicker(false);
                      }}
                      style={{ backgroundColor: col }}
                      className="w-6 h-6 rounded-md hover:scale-110 active:scale-95 transition border border-slate-200 shadow-3xs cursor-pointer"
                      title={col}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowBgColorPicker(!showBgColorPicker);
                  setShowColorPicker(false);
                }}
                className={`p-1.5 hover:bg-slate-100 border rounded-lg shadow-3xs text-xs font-semibold flex items-center gap-1 transition duration-150 ease-in-out cursor-pointer ${
                  showBgColorPicker ? 'bg-pink-50 border-pink-300' : 'bg-white border-slate-200'
                }`}
                title="Text Highlight Background Color"
              >
                <div 
                  className="w-3 h-3 rounded-full border border-slate-400" 
                  style={{ 
                    backgroundColor: activeFormats.hiliteColor && activeFormats.hiliteColor !== 'transparent' && activeFormats.hiliteColor !== 'rgba(0, 0, 0, 0)' && activeFormats.hiliteColor !== '#ffffff' 
                      ? activeFormats.hiliteColor 
                      : '#fef9c3' 
                  }} 
                />
                <span className="hidden md:inline text-[10px] text-slate-700 font-semibold select-none">Highlight</span>
              </button>
              
              {showBgColorPicker && (
                <div className="absolute left-0 mt-1.5 z-40 bg-white border border-slate-200 rounded-xl shadow-lg p-3 grid grid-cols-4 gap-1.5 w-40 animate-scale-in">
                  {bgColors.map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => {
                        executeCmd('hiliteColor', col);
                        setShowBgColorPicker(false);
                      }}
                      style={{ backgroundColor: col }}
                      className="w-6 h-6 rounded-md hover:scale-110 active:scale-95 transition border border-slate-200 shadow-3xs cursor-pointer"
                      title={col}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Complex nodes: Link, Table, Media, Blockquote, Code block */}
            <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg p-0.5 shadow-3xs">
              <button
                type="button"
                onClick={() => setShowLinkModal(true)}
                className="p-1.5 hover:bg-slate-100 rounded text-slate-700 transition cursor-pointer"
                title="Insert Hyperlink"
              >
                <LinkIcon className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setShowTableModal(true)}
                className="p-1.5 hover:bg-slate-100 rounded text-slate-700 transition cursor-pointer"
                title="Insert Data Table Grid"
              >
                <TableIcon className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setShowMediaModal(true)}
                className="p-1.5 hover:bg-slate-100 rounded text-slate-700 transition cursor-pointer"
                title="Embed Images, Lecture Photos or YouTube Videos"
              >
                <ImageIcon className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg p-0.5 shadow-3xs">
              <button
                type="button"
                onClick={handleBlockquote}
                className={getBtnClass(activeFormats.blockquote)}
                title="Apply Blockquote Structure"
              >
                <Quote className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleCodeBlock}
                className={getBtnClass(activeFormats.codeBlock)}
                title="Apply Pre-formatted Code Block"
              >
                <Code className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Saved status feedback spinner indicator */}
        <div className="flex items-center gap-1.5">
          {saveState === 'saved' && (
            <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 flex items-center gap-1 select-none">
              <CloudCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Auto-Saved</span>
            </span>
          )}
          {saveState === 'saving' && (
            <span className="text-[10px] font-mono font-bold text-pink-600 bg-pink-50 px-2 py-0.5 rounded border border-pink-100 flex items-center gap-1 select-none">
              <CloudUpload className="w-3.5 h-3.5 text-pink-500 animate-bounce" />
              <span>Saving...</span>
            </span>
          )}
        </div>
      </div>

      {/* Editor Content Area Canvas */}
      <div className="flex-1 w-full min-h-[300px] flex flex-col">
        <div
          id="wysiwyg-contenteditable"
          ref={editorRef}
          contentEditable
          onInput={handleContentChange}
          onPaste={handlePaste}
          onKeyUp={updateActiveStates}
          onMouseUp={updateActiveStates}
          onFocus={updateActiveStates}
          className="flex-1 text-slate-900 border-none outline-none font-sans leading-relaxed md:leading-loose text-sm p-4 md:p-6 text-left overflow-y-auto max-h-[500px] prose prose-slate max-w-none focus:outline-none min-h-[300px]"
          style={{ minHeight: '300px' }}
        />
      </div>

      {/* MODAL 1: INSERT LINK */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-3xs animate-fade-in font-sans">
          <form onSubmit={handleInsertLink} className="bg-white rounded-2xl border border-slate-200 max-w-sm w-full shadow-2xl overflow-hidden animate-scale-in">
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-pink-50 flex items-center justify-center text-pink-600 shrink-0">
                  <LinkIcon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 font-display">Insert Hyperlink Link</h4>
                  <p className="text-[10px] text-slate-400 font-medium">Link text to an external web page</p>
                </div>
              </div>

              <div className="space-y-3 pt-1">
                <div className="space-y-1">
                  <label htmlFor="input-link-text-val" className="text-[10px] font-bold text-gray-400 uppercase tracking-wide font-mono">Display Anchor Text</label>
                  <input
                    id="input-link-text-val"
                    type="text"
                    required
                    placeholder="e.g., Mathematical Sandbox"
                    value={linkText}
                    onChange={(e) => setLinkText(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-pink-500"
                  />
                  <p className="text-[10px] text-slate-400 italic">Optional if you already have text selected in the editor.</p>
                </div>

                <div className="space-y-1">
                  <label htmlFor="input-link-url-val" className="text-[10px] font-bold text-gray-400 uppercase tracking-wide font-mono">Destination URL</label>
                  <input
                    id="input-link-url-val"
                    type="url"
                    required
                    placeholder="https://example.com/lecture-doc"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-pink-500 font-mono"
                  />
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer select-none">
                    <input
                      id="checkbox-link-new-tab"
                      type="checkbox"
                      checked={linkInNewTab}
                      onChange={(e) => setLinkInNewTab(e.target.checked)}
                      className="accent-pink-600"
                    />
                    Open link in a next tab
                  </label>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 px-5 py-3.5 flex justify-end gap-2 border-t border-slate-150">
              <button
                id="btn-link-modal-cancel"
                type="button"
                onClick={() => {
                  setLinkUrl('');
                  setLinkText('');
                  setShowLinkModal(false);
                }}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-500 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="btn-link-modal-submit"
                type="submit"
                className="px-3 py-1.5 bg-pink-600 hover:bg-pink-700 text-white rounded-lg text-[11px] font-bold transition shadow-sm cursor-pointer"
              >
                Insert Link
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 2: INSERT TABLE */}
      {showTableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-3xs animate-fade-in font-sans">
          <form onSubmit={handleInsertTable} className="bg-white rounded-2xl border border-slate-200 max-w-sm w-full shadow-2xl overflow-hidden animate-scale-in">
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-pink-50 flex items-center justify-center text-pink-600 shrink-0">
                  <TableIcon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 font-display">Insert Data Table Grid</h4>
                  <p className="text-[10px] text-slate-400 font-medium">Build a responsive tabular grid structure</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-1">
                <div className="space-y-1">
                  <label htmlFor="input-table-rows" className="text-[10px] font-bold text-gray-400 uppercase tracking-wide font-mono">Total Rows</label>
                  <input
                    id="input-table-rows"
                    type="number"
                    min="1"
                    max="15"
                    required
                    value={tableRows}
                    onChange={(e) => setTableRows(parseInt(e.target.value) || 2)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-pink-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="input-table-cols" className="text-[10px] font-bold text-gray-400 uppercase tracking-wide font-mono">Total Columns</label>
                  <input
                    id="input-table-cols"
                    type="number"
                    min="1"
                    max="10"
                    required
                    value={tableCols}
                    onChange={(e) => setTableCols(parseInt(e.target.value) || 2)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-pink-500 font-mono"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer select-none">
                  <input
                    id="checkbox-table-header"
                    type="checkbox"
                    checked={tableHasHeader}
                    onChange={(e) => setTableHasHeader(e.target.checked)}
                    className="accent-pink-600"
                  />
                  Contain bold highlight header row
                </label>
              </div>
            </div>

            <div className="bg-slate-50 px-5 py-3.5 flex justify-end gap-2 border-t border-slate-150">
              <button
                id="btn-table-modal-cancel"
                type="button"
                onClick={() => setShowTableModal(false)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-500 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="btn-table-modal-submit"
                type="submit"
                className="px-3 py-1.5 bg-pink-600 hover:bg-pink-700 text-white rounded-lg text-[11px] font-bold transition shadow-sm cursor-pointer"
              >
                Insert Grid Table
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 3: INSERT MEDIA */}
      {showMediaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-3xs animate-fade-in font-sans">
          <form onSubmit={handleInsertMedia} className="bg-white rounded-2xl border border-slate-200 max-w-sm w-full shadow-2xl overflow-hidden animate-scale-in">
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-pink-50 flex items-center justify-center text-pink-600 shrink-0">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 font-display">Embed Study Media</h4>
                  <p className="text-[10px] text-slate-400 font-medium">Add visuals, maps, photos or Youtube clips</p>
                </div>
              </div>

              {/* Selector Image or Video */}
              <div className="flex bg-slate-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setMediaType('image')}
                  className={`flex-1 text-center py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                    mediaType === 'image' ? 'bg-white text-pink-600 shadow-3xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Illustration Image
                </button>
                <button
                  type="button"
                  onClick={() => setMediaType('video')}
                  className={`flex-1 text-center py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                    mediaType === 'video' ? 'bg-white text-pink-600 shadow-3xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  YouTube / Video
                </button>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label htmlFor="input-media-url" className="text-[10px] font-bold text-gray-400 uppercase tracking-wide font-mono">Resource URL</label>
                  <input
                    id="input-media-url"
                    type="url"
                    required
                    placeholder={mediaType === 'image' ? "https://images.unsplash.com/photo-..." : "https://youtube.com/watch?v=..."}
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-pink-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="input-media-caption" className="text-[10px] font-bold text-gray-400 uppercase tracking-wide font-mono">Visual Caption / Label</label>
                  <input
                    id="input-media-caption"
                    type="text"
                    placeholder="e.g. Figure 2.3: Graphic depiction of algebraic variables"
                    value={mediaCaption}
                    onChange={(e) => setMediaCaption(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-pink-500"
                  />
                </div>
              </div>
            </div>

            <div className="bg-slate-50 px-5 py-3.5 flex justify-end gap-2 border-t border-slate-150">
              <button
                id="btn-media-modal-cancel"
                type="button"
                onClick={() => {
                  setMediaUrl('');
                  setMediaCaption('');
                  setShowMediaModal(false);
                }}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-500 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="btn-media-modal-submit"
                type="submit"
                className="px-3 py-1.5 bg-pink-600 hover:bg-pink-700 text-white rounded-lg text-[11px] font-bold transition shadow-sm cursor-pointer"
              >
                Embed Media
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
