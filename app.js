import React, { useState, useEffect } from 'react';
import { Plus, Trash2, FolderPlus, ChevronRight, ChevronDown, Save, RefreshCw, MessageSquare, Mic, X } from 'lucide-react';

export default function VaultApp() {
  const [vaultId, setVaultId] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [vault, setVault] = useState({ folders: [], notes: [] });
  const [selectedNote, setSelectedNote] = useState(null);
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [commentText, setCommentText] = useState('');
  const [username, setUsername] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);

  useEffect(() => {
    if (isLoggedIn && vaultId) {
      loadVault();
    }
  }, [isLoggedIn, vaultId]);

  const loadVault = async () => {
    setLoading(true);
    try {
      const key = `vault_${vaultId}`;
      const result = await window.storage.get(key, true);
      if (result) {
        setVault(JSON.parse(result.value));
      } else {
        setVault({ folders: [], notes: [] });
      }
    } catch (error) {
      console.log('New vault created');
      setVault({ folders: [], notes: [] });
    }
    setLoading(false);
  };

  const saveVault = async () => {
    setSaveStatus('Saving...');
    try {
      const key = `vault_${vaultId}`;
      await window.storage.set(key, JSON.stringify(vault), true);
      setSaveStatus('Saved ✓');
      setTimeout(() => setSaveStatus(''), 2000);
    } catch (error) {
      setSaveStatus('Error saving');
      console.error('Save error:', error);
    }
  };

  const handleLogin = () => {
    if (vaultId.trim() && username.trim()) {
      setIsLoggedIn(true);
    }
  };

  const createFolder = () => {
    const name = prompt('Folder name:');
    if (name) {
      setVault({
        ...vault,
        folders: [...vault.folders, { id: Date.now().toString(), name, notes: [] }]
      });
    }
  };

  const createNote = (folderId = null) => {
    const title = prompt('Note title:');
    if (title) {
      const newNote = {
        id: Date.now().toString(),
        title,
        content: '',
        folderId,
        created: new Date().toISOString(),
        comments: [],
        images: [],
        audioNotes: [],
        links: []
      };
      
      if (folderId) {
        setVault({
          ...vault,
          folders: vault.folders.map(f => 
            f.id === folderId 
              ? { ...f, notes: [...f.notes, newNote.id] }
              : f
          ),
          notes: [...vault.notes, newNote]
        });
      } else {
        setVault({
          ...vault,
          notes: [...vault.notes, newNote]
        });
      }
      setSelectedNote(newNote);
    }
  };

  const updateNote = (noteId, content) => {
    setVault({
      ...vault,
      notes: vault.notes.map(n => n.id === noteId ? { ...n, content } : n)
    });
    if (selectedNote?.id === noteId) {
      setSelectedNote({ ...selectedNote, content });
    }
  };

  const deleteNote = (noteId) => {
    if (confirm('Delete this note?')) {
      setVault({
        ...vault,
        notes: vault.notes.filter(n => n.id !== noteId),
        folders: vault.folders.map(f => ({
          ...f,
          notes: f.notes.filter(id => id !== noteId)
        }))
      });
      setSelectedNote(null);
    }
  };

  const addComment = () => {
    if (!commentText.trim()) return;
    
    const newComment = {
      id: Date.now().toString(),
      text: commentText,
      author: username,
      timestamp: new Date().toISOString()
    };
    
    setVault({
      ...vault,
      notes: vault.notes.map(n => 
        n.id === selectedNote.id 
          ? { ...n, comments: [...(n.comments || []), newComment] }
          : n
      )
    });
    
    setSelectedNote({
      ...selectedNote,
      comments: [...(selectedNote.comments || []), newComment]
    });
    
    setCommentText('');
  };

  const addImage = () => {
    const url = prompt('Enter image URL:');
    if (url) {
      setVault({
        ...vault,
        notes: vault.notes.map(n => 
          n.id === selectedNote.id 
            ? { ...n, images: [...(n.images || []), { id: Date.now().toString(), url }] }
            : n
        )
      });
      setSelectedNote({
        ...selectedNote,
        images: [...(selectedNote.images || []), { id: Date.now().toString(), url }]
      });
    }
  };

  const addLink = () => {
    const url = prompt('Enter link URL:');
    if (url) {
      const title = prompt('Link title (optional):') || url;
      setVault({
        ...vault,
        notes: vault.notes.map(n => 
          n.id === selectedNote.id 
            ? { ...n, links: [...(n.links || []), { id: Date.now().toString(), url, title }] }
            : n
        )
      });
      setSelectedNote({
        ...selectedNote,
        links: [...(selectedNote.links || []), { id: Date.now().toString(), url, title }]
      });
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        
        setVault({
          ...vault,
          notes: vault.notes.map(n => 
            n.id === selectedNote.id 
              ? { ...n, audioNotes: [...(n.audioNotes || []), { id: Date.now().toString(), url, timestamp: new Date().toISOString() }] }
              : n
          )
        });
        setSelectedNote({
          ...selectedNote,
          audioNotes: [...(selectedNote.audioNotes || []), { id: Date.now().toString(), url, timestamp: new Date().toISOString() }]
        });
        
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) {
      alert('Microphone access denied');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  const toggleFolder = (folderId) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const renderContent = (content) => {
    const lines = content.split('\n');
    return lines.map((line, i) => {
      const ytMatch = line.match(/https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)(?:&t=(\d+))?/);
      if (ytMatch) {
        const videoId = ytMatch[1];
        const timestamp = ytMatch[2] || 0;
        return (
          <div key={i} className="my-4">
            <iframe
              width="100%"
              height="315"
              src={`https://www.youtube.com/embed/${videoId}?start=${timestamp}`}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
        );
      }
      
      const imgMatch = line.match(/!\[.*?\]\((https?:\/\/[^\)]+)\)/);
      if (imgMatch) {
        return <img key={i} src={imgMatch[1]} alt="" className="max-w-full my-2 rounded" />;
      }
      
      return <p key={i} className="mb-2">{line}</p>;
    });
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
          <h1 className="text-3xl font-bold mb-2 text-slate-800">Vault Access</h1>
          <p className="text-slate-600 mb-6">Enter vault ID and your name to collaborate</p>
          <input
            type="text"
            placeholder="Your Name"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg mb-4 focus:outline-none focus:border-blue-500"
          />
          <input
            type="text"
            placeholder="Vault ID"
            value={vaultId}
            onChange={(e) => setVaultId(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg mb-4 focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={handleLogin}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-semibold"
          >
            Access Vault
          </button>
          <p className="text-sm text-slate-500 mt-4">
            Share vault ID with friends for collaboration
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-100">
      <div className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-slate-800">Vault: {vaultId}</h1>
          <span className="text-sm text-slate-500">({username})</span>
          <button onClick={loadVault} className="p-2 hover:bg-slate-100 rounded transition" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-600">{saveStatus}</span>
          <button onClick={saveVault} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition">
            <Save className="w-4 h-4" />
            Save
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-64 bg-white border-r flex flex-col">
          <div className="p-4 border-b space-y-2">
            <button onClick={() => createNote(null)} className="w-full flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition">
              <Plus className="w-4 h-4" />
              New Note
            </button>
            <button onClick={createFolder} className="w-full flex items-center gap-2 border border-slate-300 px-4 py-2 rounded hover:bg-slate-50 transition">
              <FolderPlus className="w-4 h-4" />
              New Folder
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {vault.notes.filter(n => !n.folderId).map(note => (
              <div key={note.id} onClick={() => setSelectedNote(note)} className={`px-3 py-2 rounded cursor-pointer mb-1 ${selectedNote?.id === note.id ? 'bg-blue-100 text-blue-700' : 'hover:bg-slate-100'}`}>
                {note.title}
              </div>
            ))}

            {vault.folders.map(folder => (
              <div key={folder.id} className="mb-2">
                <div onClick={() => toggleFolder(folder.id)} className="flex items-center gap-2 px-3 py-2 rounded cursor-pointer hover:bg-slate-100">
                  {expandedFolders.has(folder.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  <span className="font-medium">{folder.name}</span>
                </div>
                {expandedFolders.has(folder.id) && (
                  <div className="ml-6">
                    {folder.notes.map(noteId => {
                      const note = vault.notes.find(n => n.id === noteId);
                      return note ? (
                        <div key={note.id} onClick={() => setSelectedNote(note)} className={`px-3 py-2 rounded cursor-pointer mb-1 ${selectedNote?.id === note.id ? 'bg-blue-100 text-blue-700' : 'hover:bg-slate-100'}`}>
                          {note.title}
                        </div>
                      ) : null;
                    })}
                    <button onClick={() => createNote(folder.id)} className="w-full text-left px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded">
                      + Add note
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          {selectedNote ? (
            <>
              <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-800">{selectedNote.title}</h2>
                <div className="flex gap-2">
                  <button onClick={addImage} className="p-2 hover:bg-slate-100 rounded" title="Add Image">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21 15 16 10 5 21"/>
                    </svg>
                  </button>
                  <button onClick={addLink} className="p-2 hover:bg-slate-100 rounded" title="Add Link">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                    </svg>
                  </button>
                  <button onClick={isRecording ? stopRecording : startRecording} className={`p-2 rounded ${isRecording ? 'bg-red-500 text-white' : 'hover:bg-slate-100'}`} title="Audio Note">
                    <Mic className="w-5 h-5" />
                  </button>
                  <button onClick={() => deleteNote(selectedNote.id)} className="p-2 text-red-600 hover:bg-red-50 rounded">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6">
                <textarea
                  value={selectedNote.content}
                  onChange={(e) => updateNote(selectedNote.id, e.target.value)}
                  placeholder="Type notes... Paste YouTube links with &t=123 for timestamps"
                  className="w-full h-48 p-4 border rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                />

                {selectedNote.images?.length > 0 && (
                  <div className="mb-4">
                    <h3 className="font-bold mb-2">Images</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {selectedNote.images.map(img => (
                        <img key={img.id} src={img.url} alt="" className="w-full h-32 object-cover rounded" />
                      ))}
                    </div>
                  </div>
                )}

                {selectedNote.links?.length > 0 && (
                  <div className="mb-4">
                    <h3 className="font-bold mb-2">Links</h3>
                    {selectedNote.links.map(link => (
                      <a key={link.id} href={link.url} target="_blank" className="block text-blue-600 hover:underline mb-1">
                        {link.title}
                      </a>
                    ))}
                  </div>
                )}

                {selectedNote.audioNotes?.length > 0 && (
                  <div className="mb-4">
                    <h3 className="font-bold mb-2">Audio Notes</h3>
                    {selectedNote.audioNotes.map(audio => (
                      <div key={audio.id} className="mb-2">
                        <audio controls src={audio.url} className="w-full" />
                        <span className="text-xs text-slate-500">{new Date(audio.timestamp).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="border-t pt-4">
                  <h3 className="font-bold mb-2">Preview</h3>
                  <div className="prose max-w-none mb-6">
                    {renderContent(selectedNote.content)}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-bold mb-3 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Comments ({selectedNote.comments?.length || 0})
                  </h3>
                  <div className="space-y-3 mb-4">
                    {selectedNote.comments?.map(comment => (
                      <div key={comment.id} className="bg-slate-50 p-3 rounded">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-semibold text-sm">{comment.author}</span>
                          <span className="text-xs text-slate-500">{new Date(comment.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="text-sm">{comment.text}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addComment()}
                      placeholder="Add a comment..."
                      className="flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button onClick={addComment} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                      Post
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400">
              <div className="text-center">
                <p className="text-xl mb-2">No note selected</p>
                <p className="text-sm">Create or select a note to get started</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}