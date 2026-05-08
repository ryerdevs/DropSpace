import { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, ExternalLink, QrCode, MonitorSmartphone, Laptop, Smartphone, Trash2, Send, Paperclip, File, Image as ImageIcon, Download, FileText, FileArchive, FileVideo, FileAudio, FileCode, X, Search, ChevronRight, Github, Linkedin, AlertCircle, ShieldCheck, Link } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { WebRTCManager } from './lib/webrtc';

const getFileIcon = (fileType: string) => {
  if (fileType.includes('pdf') || fileType.includes('document')) return <FileText className="w-5 h-5 text-red-500" />;
  if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('tar')) return <FileArchive className="w-5 h-5 text-yellow-600" />;
  if (fileType.includes('video')) return <FileVideo className="w-5 h-5 text-purple-500" />;
  if (fileType.includes('audio')) return <FileAudio className="w-5 h-5 text-pink-500" />;
  if (fileType.includes('json') || fileType.includes('javascript') || fileType.includes('html')) return <FileCode className="w-5 h-5 text-blue-500" />;
  return <File className="w-5 h-5 text-gray-400" />;
};


// Helper to extract URLs
const extractUrls = (text: string): string[] => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const matches = text.match(urlRegex) || [];
  
  let extractedUrls = Array.from(new Set(matches));
  if (extractedUrls.length === 0 && text.includes('.')) {
    extractedUrls = text.split('\n').map(l => l.trim()).filter(l => l.length > 0).map(url => {
      if (!url.startsWith('http://') && !url.startsWith('https://')) return `https://${url}`;
      return url;
    });
  }
  return extractedUrls.filter(u => {
    try { new URL(u); return true; } catch { return false; }
  });
};

type FileMessage = {
  fileName: string;
  fileType: string;
  fileData: ArrayBuffer | Blob;
  receivedAt: number;
};

type SentItem = {
  type: 'link' | 'file';
  name: string;
  size?: number;
  sentAt: number;
};

export default function App() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  
  const [desktopToMobileTabs, setDesktopToMobileTabs] = useState<string[]>([]);
  const [mobileToDesktopTabs, setMobileToDesktopTabs] = useState<string[]>([]);
  
  const [desktopToMobileFiles, setDesktopToMobileFiles] = useState<FileMessage[]>([]);
  const [mobileToDesktopFiles, setMobileToDesktopFiles] = useState<FileMessage[]>([]);
  
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingLinks, setPendingLinks] = useState<string[]>([]);
  const [sentItems, setSentItems] = useState<SentItem[]>([]);
  
  // Send Panel State moved up to prevent unmounting
  const [isDragging, setIsDragging] = useState(false);
  const [activeSendTab, setActiveSendTab] = useState<'files' | 'links'>('files');

  const [status, setStatus] = useState<'waiting' | 'connected'>('waiting');
  const [sendStatus, setSendStatus] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [mobileActiveTab, setMobileActiveTab] = useState<'send' | 'receive'>('send');
  const [selectedImage, setSelectedImage] = useState<{url: string, name: string} | null>(null);
  
  const [inputText, setInputText] = useState('');
  const [appUrl, setAppUrl] = useState('');
  
  const rtcRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // refs for state to be used inside callbacks without stale closures
  const stateRef = useRef({
    desktopToMobileTabs,
    mobileToDesktopTabs,
    isMobile
  });
  
  useEffect(() => {
    stateRef.current = { desktopToMobileTabs, mobileToDesktopTabs, isMobile };
  }, [desktopToMobileTabs, mobileToDesktopTabs, isMobile]);

  const showSendFeedback = (msg: string) => {
    setSendStatus(msg);
    setTimeout(() => {
      setSendStatus(null);
    }, 3000);
  };

  const showError = (msg: string) => {
    setErrorStatus(msg);
    setTimeout(() => {
      setErrorStatus(null);
    }, 4000);
  };

  // --- Demo Automator ---
  useEffect(() => {
    const isDemo = new URLSearchParams(window.location.search).get('demo') === '1';
    if (!isDemo || isMobile) return;

    let isCancelled = false;

    const runDemo = async () => {
      const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
      
      // 1. Initial wait showing QR
      await wait(3000);
      if (isCancelled) return;

      // 2. Simulate mobile connection magically
      setStatus('connected');
      
      // 3. Wait a moment then receive photos from mobile
      await wait(1800);
      if (isCancelled) return;
      
      const receiveImage = (title: string, color1: string, color2: string) => {
        const canvas = document.createElement('canvas');
        canvas.width = 800; canvas.height = 600;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const gradient = ctx.createLinearGradient(0, 0, 800, 600);
          gradient.addColorStop(0, color1);
          gradient.addColorStop(1, color2);
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, 800, 600);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 50px sans-serif';
          ctx.fillText('Photo', 320, 310);
        }
        canvas.toBlob((blob) => {
          if (blob) {
            blob.arrayBuffer().then(buffer => {
              if (isCancelled) return;
              setMobileToDesktopFiles(prev => [...prev, {
                fileName: title,
                fileType: "image/jpeg",
                fileData: buffer,
                receivedAt: Date.now()
              }]);
            });
          }
        }, 'image/jpeg');
      };

      receiveImage("IMG_0941.jpg", "#3b82f6", "#8b5cf6");
      
      await wait(1200);
      if (isCancelled) return;
      
      receiveImage("IMG_0942.jpg", "#ec4899", "#f43f5e");
      
      await wait(1500);
      if (isCancelled) return;

      // 4. Simulate a link being sent from mobile
      setMobileToDesktopTabs(prev => [...prev, "https://github.com/ryerdevs", "https://wikipedia.org", "https://figma.com"]);
      
      await wait(3500);
      if (isCancelled) return;
      
      // Restart loop
      setStatus('waiting');
      setMobileToDesktopFiles([]);
      setMobileToDesktopTabs([]);
      setSentItems([]);
      runDemo();
    };

    runDemo();

    return () => {
      isCancelled = true;
    };
  }, [isMobile]);

  // Initialize socket and connection
  useEffect(() => {
    setAppUrl(window.location.origin);
    const params = new URLSearchParams(window.location.search);
    const sessionFromUrl = params.get('session');
    
    const sid = sessionFromUrl || uuidv4();
    setSessionId(sid);
    const isMob = !!sessionFromUrl;
    setIsMobile(isMob);

    const rtc = new WebRTCManager(!isMob, sid, {
      onConnect: () => {
        setStatus('connected');
        // Desktop sends its state to the new mobile connection
        if (!stateRef.current.isMobile) {
          rtc.syncState({
            desktopToMobileTabs: stateRef.current.desktopToMobileTabs,
            mobileToDesktopTabs: stateRef.current.mobileToDesktopTabs
          });
        }
      },
      onDisconnect: () => {
        setStatus('waiting');
      },
      onReceiveTabs: (tabs) => {
        if (stateRef.current.isMobile) {
           setDesktopToMobileTabs(prev => Array.from(new Set([...prev, ...tabs])));
        } else {
           setMobileToDesktopTabs(prev => Array.from(new Set([...prev, ...tabs])));
        }
      },
      onReceiveFile: (fileData, fileName, fileType) => {
        const newFile = { fileName, fileType, fileData, receivedAt: Date.now() };
        if (stateRef.current.isMobile) {
          setDesktopToMobileFiles(prev => [...prev, newFile]);
        } else {
          setMobileToDesktopFiles(prev => [...prev, newFile]);
        }
      },
      onSyncRequest: () => {
        if (!stateRef.current.isMobile) {
          rtc.syncState({
            desktopToMobileTabs: stateRef.current.desktopToMobileTabs,
            mobileToDesktopTabs: stateRef.current.mobileToDesktopTabs
          });
        }
      },
      onSyncState: (state) => {
        if (state.desktopToMobileTabs) setDesktopToMobileTabs(state.desktopToMobileTabs);
        if (state.mobileToDesktopTabs) setMobileToDesktopTabs(state.mobileToDesktopTabs);
        setStatus('connected');
      }
    });

    rtcRef.current = rtc;

    rtc.connect();

    return () => {
      rtc.destroy();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSend = async () => {
    if (!sessionId || !rtcRef.current) return;
    
    if (status !== 'connected') {
      showError("Not connected to peer yet. Please wait.");
      return;
    }

    let sentSomething = false;
    const newSentItems: SentItem[] = [];
    
    const extractedUrls = extractUrls(inputText);
    const allLinks = [...pendingLinks, ...extractedUrls];
    const uniqueLinks = Array.from(new Set(allLinks));

    if (uniqueLinks.length > 0) {
      const toAdd = isMobile 
        ? uniqueLinks.filter(url => !mobileToDesktopTabs.includes(url))
        : uniqueLinks.filter(url => !desktopToMobileTabs.includes(url));

      if (toAdd.length > 0) {
        try {
          rtcRef.current.sendTabs(toAdd);
          // Only update state after successful send
          if (isMobile) setMobileToDesktopTabs(prev => [...prev, ...toAdd]);
          else setDesktopToMobileTabs(prev => [...prev, ...toAdd]);
          
          sentSomething = true;
          toAdd.forEach(url => {
            newSentItems.push({ type: 'link', name: url, sentAt: Date.now() });
          });
        } catch (err) {
          console.error("Tab send error", err);
          showError("Failed to send links.");
        }
      }
    }
    
    if (pendingFiles.length > 0) {
      const remainingFiles = [];
      for (const file of pendingFiles) {
        let success = false;
        let lastErr;
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            await rtcRef.current.sendFile(file);
            success = true;
            break;
          } catch (err) {
            lastErr = err;
            console.warn(`File send attempt ${attempt} failed, retrying...`, err);
            await new Promise(resolve => setTimeout(resolve, 800));
          }
        }

        if (success) {
          const fileMsg = { fileName: file.name, fileType: file.type, fileData: file, receivedAt: Date.now() };
          if (isMobile) setMobileToDesktopFiles(prev => [...prev, fileMsg]);
          else setDesktopToMobileFiles(prev => [...prev, fileMsg]);
          
          newSentItems.push({ type: 'file', name: file.name, size: file.size, sentAt: Date.now() });
          sentSomething = true;
        } else {
           console.error("File send error", lastErr);
           showError(`Failed to send ${file.name}`);
           remainingFiles.push(file); // Keep files that failed
        }
      }
      setPendingFiles(remainingFiles);
    }
    
    if (sentSomething) {
      setInputText('');
      setPendingLinks([]);
      setSentItems(prev => [...newSentItems.reverse(), ...prev]);
      showSendFeedback("Sent successfully!");
    } else {
      if (inputText.trim() !== '' && extractedUrls.length === 0 && pendingLinks.length === 0) {
        showError("No valid URLs found in text.");
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const validFiles = files.filter(f => {
      if (f.size > 100 * 1024 * 1024) {
        showError(`File '${f.name}' is too large! Maximum allowed is 100MB.`);
        return false;
      }
      return true;
    });

    setPendingFiles(prev => [...prev, ...validFiles]);
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const clearReceivedTabs = () => {
    if (isMobile) {
      setDesktopToMobileTabs([]);
      setDesktopToMobileFiles([]);
    } else {
      setMobileToDesktopTabs([]);
      setMobileToDesktopFiles([]);
    }
  };

  const removeReceivedTab = (tabUrl: string) => {
    if (isMobile) {
      setDesktopToMobileTabs(prev => prev.filter(t => t !== tabUrl));
    } else {
      setMobileToDesktopTabs(prev => prev.filter(t => t !== tabUrl));
    }
  };

  const removeReceivedFile = (fileReceivedAt: number) => {
    if (isMobile) {
      setDesktopToMobileFiles(prev => prev.filter(f => f.receivedAt !== fileReceivedAt));
    } else {
      setMobileToDesktopFiles(prev => prev.filter(f => f.receivedAt !== fileReceivedAt));
    }
  };

  const openAllTabs = () => {
    const tabsToOpen = isMobile ? desktopToMobileTabs : mobileToDesktopTabs;
    tabsToOpen.forEach(tab => {
      window.open(tab, '_blank');
    });
  };

  const downloadFile = (file: FileMessage) => {
    const blob = new Blob([file.fileData], { type: file.fileType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const qrUrl = `${appUrl}?session=${sessionId}`;
  
  // Shared Components
  const receiveTabsList = isMobile ? [...desktopToMobileTabs] : [...mobileToDesktopTabs];
  const receiveFilesList = isMobile ? [...desktopToMobileFiles] : [...mobileToDesktopFiles];
  
  const renderTabList = () => {
    const imagesList = receiveFilesList.filter(f => f.fileType.startsWith('image/'));
    const docsList = receiveFilesList.filter(f => !f.fileType.startsWith('image/'));

    return (
    <div className="flex-1 flex flex-col min-h-0 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden w-full h-full">
      <div className="p-6 border-b border-gray-50 flex items-center justify-between shrink-0">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          {isMobile ? <Laptop className="w-5 h-5 text-gray-400" /> : <Smartphone className="w-5 h-5 text-gray-400" />}
          Received Files & Links
          {(receiveTabsList.length > 0 || receiveFilesList.length > 0) && (
            <span className="text-xs font-semibold px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
              {receiveTabsList.length + receiveFilesList.length}
            </span>
          )}
        </h2>
        <div className="flex items-center gap-2">
          {receiveTabsList.length > 0 && (
            <button onClick={openAllTabs} className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-colors" title="Open all links">
              <ExternalLink className="w-4 h-4" />
            </button>
          )}
          {(receiveTabsList.length > 0 || receiveFilesList.length > 0) && (
            <button onClick={clearReceivedTabs} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors" title="Clear received items">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 p-4 custom-scrollbar bg-gray-50/50">
        <AnimatePresence initial={false}>
          {receiveTabsList.length === 0 && receiveFilesList.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="h-full flex flex-col items-center justify-center text-center space-y-4 py-8"
            >
              <div className="w-16 h-16 bg-gray-100/50 rounded-full flex items-center justify-center border border-gray-100">
                <ExternalLink className="w-6 h-6 text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-500">No items received yet</p>
              <p className="text-xs font-medium text-gray-400 mt-1">They will appear here instantly</p>
            </motion.div>
          ) : (
            <div className="space-y-6">
              
              {/* Links Section */}
              {receiveTabsList.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Links</h3>
                  {receiveTabsList.map((tab, idx) => {
                    let displayUrl = tab;
                    let hostname = '';
                    try {
                      const urlObj = new URL(tab);
                      hostname = urlObj.hostname;
                      displayUrl = urlObj.hostname + (urlObj.pathname.length > 20 ? urlObj.pathname.substring(0,20) + '...' : urlObj.pathname);
                    } catch(e) {}

                    return (
                      <motion.div 
                        key={`tab-${tab}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="flex items-center gap-3 p-3 bg-white rounded-2xl hover:shadow-md border border-gray-100 transition-all group relative">
                          <a 
                            href={tab} 
                            target="_blank" 
                            rel="noreferrer"
                            className="flex items-center gap-3 flex-1 overflow-hidden pr-6"
                          >
                            <div className="w-10 h-10 rounded-xl bg-gray-50 flex flex-shrink-0 items-center justify-center overflow-hidden border border-gray-100 p-2">
                              {hostname ? (
                                <img 
                                  src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=64`} 
                                  alt={hostname}
                                  className="w-full h-full object-contain"
                                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                              ) : (
                                <ExternalLink className="w-5 h-5 text-gray-400" />
                              )}
                            </div>
                            <div className="overflow-hidden flex-1">
                              <p className="text-sm font-semibold text-gray-900 truncate pr-2">{displayUrl}</p>
                              <p className="text-xs text-gray-500 truncate pr-2">{tab}</p>
                            </div>
                          </a>
                          <button onClick={() => removeReceivedTab(tab)} className="p-2 text-gray-400 hover:text-red-500 rounded-xl transition-colors opacity-100 lg:opacity-0 lg:group-hover:opacity-100 absolute right-2 bg-white" title="Remove link">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Images Section */}
              {imagesList.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Images</h3>
                  {imagesList.map((file, idx) => {
                    const blob = new Blob([file.fileData], { type: file.fileType });
                    const blobUrl = URL.createObjectURL(blob);

                    return (
                      <motion.div 
                        key={`file-${file.receivedAt}-${idx}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="flex items-center gap-3 p-3 bg-white rounded-2xl hover:shadow-md border border-gray-100 transition-all group relative pr-12">
                          <button 
                            onClick={() => setSelectedImage({ url: blobUrl, name: file.fileName })}
                            className="w-14 h-14 rounded-xl bg-gray-50 flex flex-shrink-0 items-center justify-center overflow-hidden border border-gray-100 p-0 hover:opacity-80 transition-opacity cursor-pointer aspect-square"
                          >
                            <img src={blobUrl} alt={file.fileName} className="w-full h-full object-cover" />
                          </button>
                          <div className="overflow-hidden flex-1">
                            <p className="text-sm font-semibold text-gray-900 truncate pr-2" title={file.fileName}>{file.fileName}</p>
                            <p className="text-xs text-gray-500 truncate pr-2">{(((file.fileData as Blob).size || (file.fileData as ArrayBuffer).byteLength) / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                          <button onClick={() => downloadFile(file)} className="p-2 text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors shrink-0">
                            <Download className="w-5 h-5" />
                          </button>
                          <button onClick={() => removeReceivedFile(file.receivedAt)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition-colors opacity-100 lg:opacity-0 lg:group-hover:opacity-100 absolute top-2 right-2 bg-white" title="Remove file">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Documents Section */}
              {docsList.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Documents</h3>
                  {docsList.map((file, idx) => {
                    return (
                      <motion.div 
                        key={`file-${file.receivedAt}-${idx}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="flex items-center gap-3 p-3 bg-white rounded-2xl hover:shadow-md border border-gray-100 transition-all group relative pr-12">
                          <div className="w-12 h-12 rounded-xl bg-gray-50 flex flex-shrink-0 items-center justify-center overflow-hidden border border-gray-100 shadow-sm">
                            {getFileIcon(file.fileType)}
                          </div>
                          <div className="overflow-hidden flex-1">
                            <p className="text-sm font-semibold text-gray-900 truncate pr-2" title={file.fileName}>{file.fileName}</p>
                            <p className="text-xs text-gray-500 truncate pr-2">{(((file.fileData as Blob).size || (file.fileData as ArrayBuffer).byteLength) / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                          <button onClick={() => downloadFile(file)} className="p-2 text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors shrink-0">
                            <Download className="w-5 h-5" />
                          </button>
                          <button onClick={() => removeReceivedFile(file.receivedAt)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition-colors opacity-100 lg:opacity-0 lg:group-hover:opacity-100 absolute top-2 right-2 bg-white" title="Remove file">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </AnimatePresence>
      </div>
      
      {receiveTabsList.length > 0 && (
        <div className="p-4 bg-white border-t border-gray-50">
          <button 
            onClick={openAllTabs}
            className="w-full py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            Open All Links
          </button>
        </div>
      )}
    </div>
  );
  };

  const renderSendPanel = () => {
    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      
      const files = Array.from(e.dataTransfer.files);
      if (!files.length) return;

      const validFiles = files.filter(f => {
        if (f.size > 100 * 1024 * 1024) {
          showError(`File '${f.name}' is too large! Maximum allowed is 100MB.`);
          return false;
        }
        return true;
      });

      setPendingFiles(prev => [...prev, ...validFiles]);
      setActiveSendTab('files');
    };

    const totalToSend = pendingFiles.length + pendingLinks.length + extractUrls(inputText).length;

    return (
      <div className="flex flex-col w-full h-full min-h-0 bg-white rounded-3xl shadow-sm border border-gray-100 p-5 lg:p-6 overflow-hidden">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4 shrink-0">
          <Send className="w-6 h-6 text-blue-600" />
          Share Instantly
        </h2>

        {/* Custom Tabs */}
        <div className="flex items-center gap-2 mb-4 shrink-0 p-1 bg-gray-50 rounded-2xl border border-gray-100">
          <button 
            onClick={() => setActiveSendTab('files')}
            className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition-all ${
              activeSendTab === 'files' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Paperclip className="w-4 h-4" />
            Files
          </button>
          <button 
            onClick={() => setActiveSendTab('links')}
            className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition-all ${
              activeSendTab === 'links' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Link className="w-4 h-4" />
            Links & Text
          </button>
        </div>

        <div className="shrink-0 mb-3">
          {activeSendTab === 'files' && (
            <div className="shrink-0">
              {/* Dropzone */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center transition-all cursor-pointer group w-full ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-400 hover:bg-gray-50'} ${pendingFiles.length > 0 ? 'py-3 flex-row gap-3' : 'p-6'}`}
              >
                {pendingFiles.length > 0 ? (
                  <>
                    <div className={`w-8 h-8 rounded-full shadow-sm flex items-center justify-center transition-transform duration-300 ${isDragging ? 'bg-blue-500 text-white scale-110' : 'bg-white border border-gray-100 text-blue-500 group-hover:scale-110'}`}>
                      <Paperclip className="w-4 h-4" />
                    </div>
                    <p className="text-sm font-semibold text-gray-800">Add more files</p>
                  </>
                ) : (
                  <>
                    <div className={`w-12 h-12 rounded-full shadow-sm flex items-center justify-center mb-3 transition-transform duration-300 ${isDragging ? 'bg-blue-500 text-white scale-110' : 'bg-white border border-gray-100 text-blue-500 group-hover:scale-110'}`}>
                      <Paperclip className="w-5 h-5" />
                    </div>
                    <p className="text-sm font-semibold text-gray-800">Choose Files or Drag here</p>
                    <p className="text-xs font-medium text-gray-500 mt-1">Images, Documents, Videos (Max 100MB)</p>
                  </>
                )}
              </div>
            </div>
          )}

          {activeSendTab === 'links' && (
            <div className="shrink-0 flex flex-col gap-2">
               <textarea 
                 className={`w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none resize-none transition-all text-sm font-medium text-gray-700 placeholder:text-gray-400 placeholder:font-medium ${pendingLinks.length > 0 ? 'min-h-[60px] h-[60px]' : 'min-h-[140px]'}`}
                 placeholder="Write a message or paste links here..."
                 value={inputText}
             onChange={(e) => {
               const newText = e.target.value;
               const urls = extractUrls(newText);
               if (urls.length > 0 && newText.endsWith(' ')) {
                 let strippedText = newText;
                 urls.forEach(url => {
                    strippedText = strippedText.replace(url, '');
                 });
                 setPendingLinks(prev => Array.from(new Set([...prev, ...urls])));
                 setInputText(strippedText.trim());
               } else if (urls.length > 0 && (e.nativeEvent as any).inputType === 'insertFromPaste') {
                 let strippedText = newText;
                 urls.forEach(url => {
                    strippedText = strippedText.replace(url, '');
                 });
                 setPendingLinks(prev => Array.from(new Set([...prev, ...urls])));
                 setInputText(strippedText.trim());
               } else {
                 setInputText(newText);
               }
             }}
             onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const urls = extractUrls(inputText);
                  if (urls.length > 0) {
                    let strippedText = inputText;
                    urls.forEach(url => {
                       strippedText = strippedText.replace(url, '');
                    });
                    setPendingLinks(prev => Array.from(new Set([...prev, ...urls])));
                    setInputText(strippedText.trim());
                    e.preventDefault();
                  }
                }
             }}
           />
        </div>
        )}
        </div>
        
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar flex flex-col gap-5 mb-4 pr-1">

          {/* Pending Links List */}
          <AnimatePresence>
          {pendingLinks.length > 0 && (
            <motion.div initial={{opacity:0, height:0}} animate={{opacity:1, height:'auto'}} exit={{opacity:0, height:0}} className="space-y-2 shrink-0 overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Links to send</h3>
              </div>
              <AnimatePresence>
              {pendingLinks.map((url, idx) => {
                let displayUrl = url;
                let hostname = '';
                try {
                  const urlObj = new URL(url);
                  hostname = urlObj.hostname;
                  displayUrl = urlObj.hostname + (urlObj.pathname.length > 20 ? urlObj.pathname.substring(0,20) + '...' : urlObj.pathname);
                } catch(e) {}

                return (
                <motion.div initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} exit={{opacity:0, scale:0.95}} transition={{ duration: 0.15 }} key={`pending-link-${url}-${idx}`} className="flex items-center gap-3 p-3 bg-indigo-50/40 rounded-xl border border-indigo-50/60 group origin-top">
                  <div className="w-10 h-10 rounded-lg bg-white shadow-sm border border-indigo-100 flex items-center justify-center shrink-0">
                    {hostname ? (
                      <>
                        <img 
                          src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=64`} 
                          alt={hostname}
                          className="w-full h-full object-contain p-2"
                          onError={(e) => { (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'block'; e.currentTarget.style.display = 'none'; }}
                        />
                        <ExternalLink className="w-5 h-5 text-indigo-500 hidden" />
                      </>
                    ) : (
                      <ExternalLink className="w-5 h-5 text-indigo-500" />
                    )}
                  </div>
                  <div className="flex-1 overflow-hidden flex flex-col justify-center">
                    <p className="text-sm font-semibold text-gray-800 truncate" title={url}>{displayUrl}</p>
                    {displayUrl !== url && <p className="text-[11px] text-gray-500 truncate mt-0.5">{url}</p>}
                  </div>
                  <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPendingLinks(prev => prev.filter((_, i) => i !== idx)) }} className="p-2 hover:bg-white rounded-lg text-gray-400 hover:text-red-500 transition-all opacity-100 lg:opacity-0 lg:group-hover:opacity-100 cursor-pointer touch-manipulation">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </motion.div>
              )})}
              </AnimatePresence>
            </motion.div>
          )}
          </AnimatePresence>

          {/* Pending Files List */}
          <AnimatePresence>
          {pendingFiles.length > 0 && (
            <motion.div initial={{opacity:0, height:0}} animate={{opacity:1, height:'auto'}} exit={{opacity:0, height:0}} className="space-y-2 shrink-0 overflow-hidden mt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Ready to send</h3>
                <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{pendingFiles.length} file(s)</span>
              </div>
              <AnimatePresence>
              {pendingFiles.map((file, idx) => {
                const isImage = file.type.startsWith('image/');
                const previewUrl = isImage ? URL.createObjectURL(file) : null;
                
                return (
                <motion.div initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} exit={{opacity:0, scale:0.95}} transition={{ duration: 0.15 }} key={`pending-file-${file.name}-${idx}`} className="flex items-center gap-3 p-3 bg-blue-50/40 rounded-xl border border-blue-50/60 group origin-top">
                  <div className="w-10 h-10 rounded-lg bg-white shadow-sm border border-blue-100 flex items-center justify-center shrink-0 overflow-hidden">
                    {isImage && previewUrl ? (
                      <img src={previewUrl} alt={file.name} className="w-full h-full object-cover" />
                    ) : (
                      getFileIcon(file.type)
                    )}
                  </div>
                  <div className="flex-1 overflow-hidden flex flex-col justify-center">
                    <p className="text-sm font-semibold text-gray-800 truncate" title={file.name}>{file.name}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPendingFiles(prev => prev.filter((_, i) => i !== idx)) }} className="p-2 hover:bg-white rounded-lg text-gray-400 hover:text-red-500 transition-all opacity-100 lg:opacity-0 lg:group-hover:opacity-100 cursor-pointer touch-manipulation">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </motion.div>
              )})}
              </AnimatePresence>
            </motion.div>
          )}
          </AnimatePresence>

          {/* Sent Items History */}
          {sentItems.length > 0 && (
            <div className="space-y-2 shrink-0 mt-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Recently Sent</h3>
              {sentItems.slice(0, 5).map((item, idx) => (
                <div key={`sent-${idx}`} className="flex items-center gap-3 p-3 bg-green-50/50 rounded-xl border border-green-50">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex-1 overflow-hidden flex items-center justify-between">
                    <p className="text-sm font-medium text-green-800 truncate" title={item.name}>{item.name}</p>
                    {item.type === 'file' && <p className="text-[11px] text-green-600 ml-2 shrink-0 font-medium">{(item.size! / 1024 / 1024).toFixed(2)} MB</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Send Button & Status */}
        <div className="shrink-0 mt-auto pt-4 border-t border-gray-50 bg-white">
          <AnimatePresence>
            {sendStatus && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, scale: 0.95 }}
                className="text-sm text-green-700 bg-green-50 px-4 py-3 rounded-2xl mb-4 flex items-center justify-center gap-2 font-semibold shadow-sm border border-green-100"
              >
                <div className="w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3" />
                </div>
                <span className="truncate">{sendStatus}</span>
              </motion.div>
            )}
            {errorStatus && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, scale: 0.95 }}
                className="text-sm text-red-700 bg-red-50 px-4 py-3 rounded-2xl mb-4 flex items-center justify-center gap-2 font-semibold shadow-sm border border-red-100"
              >
                <div className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shrink-0">
                  <AlertCircle className="w-3 h-3" />
                </div>
                <span className="truncate">{errorStatus}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="shrink-0 pt-2 pb-0 mt-auto">
          <button 
            onClick={handleSend}
            disabled={totalToSend === 0 || status !== 'connected'}
            className={`w-full relative overflow-hidden group flex items-center justify-center py-3 rounded-xl font-semibold transition-all shadow-md focus:ring-4 outline-none ${
              totalToSend === 0 || status !== 'connected'
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200 shadow-none hover:bg-gray-100 hover:text-gray-400' 
                : 'bg-gray-900 text-white hover:shadow-lg focus:ring-gray-200'
            }`}
          >
            {totalToSend === 0 ? (
              <span className="flex items-center gap-2">Nothing to Send <ChevronRight className="w-4 h-4" /></span>
            ) : status !== 'connected' ? (
              <span className="flex items-center gap-2">Waiting for connection...</span>
            ) : (
              <>
                <div className="absolute inset-0 bg-blue-600 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300 ease-out z-0"></div>
                <span className="relative z-10 flex items-center justify-center gap-2 w-full">
                  Send {totalToSend} {totalToSend === 1 ? 'Item' : 'Items'}
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center ml-1">
                    <Send className="w-3 h-3 text-white translate-x-[1px] translate-y-[-1px]" />
                  </div>
                </span>
              </>
            )}
          </button>
        </div>
        <input 
          type="file" 
          className="hidden" 
          ref={fileInputRef} 
          onChange={handleFileSelect}
          multiple
        />
      </div>
    );
  };

  if (isMobile) {
    return (
      <div className="fixed inset-0 flex flex-col bg-gray-50 overflow-hidden">
        {/* Mobile Header */}
        <div className="px-5 py-4 bg-white border-b border-gray-100 flex flex-col gap-3 shrink-0 shadow-sm z-10 pt-safe">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">DropSpace</h1>
            <div className="flex items-center gap-1.5">
              <a href="https://github.com/ryerdevs" target="_blank" rel="noreferrer" className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-800 transition-colors">
                <Github className="w-4 h-4" />
              </a>
              <a href="https://www.linkedin.com/in/ricardo-casamayor/" target="_blank" rel="noreferrer" className="p-1 hover:bg-blue-50 rounded-full text-gray-400 hover:text-blue-600 transition-colors">
                <Linkedin className="w-4 h-4" />
              </a>
            </div>
          </div>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 bg-gray-50/50 p-1.5 px-2.5 rounded-xl border border-gray-100/50 shrink-0">
              <div className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-gray-400 animate-pulse'}`}></div>
              <span className="text-[11px] font-semibold text-gray-700 tracking-tight">
                {status === 'connected' ? 'Secure connection established' : 'Connecting...'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-green-700 font-semibold bg-green-50 px-2 py-1 rounded-full border border-green-200 shrink-0">
              <ShieldCheck className="w-3 h-3" />
              100% Secure WebRTC
            </div>
          </div>
        </div>

        {/* Mobile Content Area */}
        <div className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            {mobileActiveTab === 'send' ? (
              <motion.div 
                key="send-tab"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 p-4 pb-24 overflow-hidden flex flex-col"
              >
                <div className="w-full h-full flex flex-col min-h-0">
                  {renderSendPanel()}
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="receive-tab"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 p-4 pb-24 overflow-hidden flex flex-col"
              >
                <div className="w-full h-full flex flex-col min-h-0">
                 {renderTabList()}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Fixed Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe z-20 px-2 py-2">
          <div className="flex items-center justify-center gap-2 max-w-sm mx-auto p-1 bg-gray-100/80 rounded-2xl backdrop-blur-md">
            <button
              onClick={() => setMobileActiveTab('send')}
              className={`flex-1 py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition-all ${
                mobileActiveTab === 'send' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-500 hover:bg-gray-200/50 hover:text-gray-900'
              }`}
            >
              <Send className="w-4 h-4" />
              Send
            </button>
            <button
              onClick={() => setMobileActiveTab('receive')}
              className={`flex-1 py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition-all ${
                mobileActiveTab === 'receive' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-500 hover:bg-gray-200/50 hover:text-gray-900'
              }`}
            >
              <Download className="w-4 h-4" />
              Receive
              {(receiveTabsList.length > 0 || receiveFilesList.length > 0) && (
                <span className="w-2 h-2 bg-red-500 rounded-full absolute top-4 right-[25%] opacity-80" />
              )}
            </button>
          </div>
        </div>
        
        {/* Fullscreen Image Lightbox */}
        <AnimatePresence>
          {selectedImage && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-4 pt-safe pb-safe"
              onClick={() => setSelectedImage(null)}
            >
              <button 
                className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-50 backdrop-blur-md"
                onClick={(e) => { e.stopPropagation(); setSelectedImage(null); }}
              >
                <X className="w-6 h-6" />
              </button>
              <img 
                src={selectedImage.url} 
                alt={selectedImage.name} 
                className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" 
                onClick={(e) => e.stopPropagation()}
              />
              <p className="text-white/80 mt-4 font-medium text-sm text-center px-4 truncate w-full">{selectedImage.name}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  if (!sessionId && !isMobile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500 animate-pulse font-medium">Generating secure bridge...</p>
      </div>
    );
  }

  // Desktop View
  return (
    <div className="h-[100dvh] overflow-hidden bg-gray-50 flex flex-col font-sans text-gray-900 relative">
      
      {/* Fullscreen Image Lightbox */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-4"
            onClick={() => setSelectedImage(null)}
          >
            <button 
              className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-50"
              onClick={(e) => { e.stopPropagation(); setSelectedImage(null); }}
            >
              <X className="w-6 h-6" />
            </button>
            <img 
              src={selectedImage.url} 
              alt={selectedImage.name} 
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" 
              onClick={(e) => e.stopPropagation()}
            />
            <p className="text-white/80 mt-4 font-medium text-sm">{selectedImage.name}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 w-full flex flex-col items-center justify-center p-4 min-h-0">
        <div className="w-full max-w-5xl flex flex-col flex-1 max-h-[720px] min-h-0">
          
          {/* Header */}
          <div className="text-center space-y-3 shrink-0 mb-6 flex flex-col items-center">
            <div className="inline-flex items-center justify-center p-2 bg-blue-50 rounded-[14px] mb-1">
              <QrCode className="w-6 h-6 text-blue-600" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight mt-1 text-gray-900 pb-1">DropSpace</h1>
            <p className="text-sm font-medium text-gray-500 max-w-md mx-auto text-center leading-relaxed">
              The fastest way to seamlessly share files, links, and tabs across your devices securely.
            </p>
            <div className="flex justify-center items-center gap-1.5 text-[11px] text-green-700 mt-2 font-semibold bg-green-50/80 w-max mx-auto px-3 py-1 rounded-full border border-green-200/60 shadow-sm">
              <ShieldCheck className="w-3.5 h-3.5" />
              100% Secure & End-to-End Encrypted (WebRTC)
            </div>
          </div>

          {status === 'waiting' ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center p-8 bg-white rounded-3xl shadow-[0_2px_15px_-4px_rgba(0,0,0,0.02)] border border-gray-100/50 max-w-sm mx-auto w-full shrink-0"
            >
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-6">Link Your Mobile Device</h2>
              <div className="p-3 bg-white rounded-2xl shadow-[0_0_20px_-5px_rgba(0,0,0,0.05)] border border-gray-100">
                <QRCodeSVG value={qrUrl} size={180} fgColor="#111827" />
              </div>
              <div className="flex items-center justify-center gap-2 mt-6">
                <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse"></div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Waiting for connection...
                </span>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 items-stretch w-full max-w-5xl mx-auto flex-1 min-h-0 pb-2 overflow-hidden"
            >
              <div className="flex flex-col h-full min-h-0 overflow-hidden">
                {renderSendPanel()}
              </div>
              <div className="flex flex-col h-full min-h-0 overflow-hidden">
                {renderTabList()}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Static Footer */}
      <footer className="w-full shrink-0 bg-transparent py-1.5 px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between z-10 gap-2 relative">
        <div className="flex items-center gap-3 order-2 sm:order-1">
          {status === 'connected' ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-row items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)] animate-pulse"></div>
              <span className="text-xs font-medium text-gray-600 tracking-tight">Secure connection established</span>
            </motion.div>
          ) : (
            <div className="flex flex-row items-center gap-2 opacity-50">
              <div className="w-2 h-2 rounded-full bg-gray-300"></div>
              <span className="text-xs font-medium text-gray-400 tracking-tight">Waiting for connection...</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3 text-xs text-gray-400 font-medium order-1 sm:order-2">
          <div className="flex items-center gap-0.5">
            <a href="https://github.com/ryerdevs" target="_blank" rel="noreferrer" className="p-1.5 hover:bg-gray-100 rounded-lg hover:text-gray-900 transition-all text-gray-400">
              <Github className="w-3.5 h-3.5" />
            </a>
            <a href="https://www.linkedin.com/in/ricardo-casamayor/" target="_blank" rel="noreferrer" className="p-1.5 hover:bg-blue-50 rounded-lg hover:text-blue-600 transition-all text-gray-400">
              <Linkedin className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
