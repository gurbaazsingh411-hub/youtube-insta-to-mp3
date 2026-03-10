"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Link as LinkIcon, Loader2, Music, CheckCircle, AlertCircle, Upload, FileAudio } from "lucide-react";
import axios from "axios";

export default function Home() {
  const [mode, setMode] = useState<"url" | "upload">("url");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownload = async () => {
    if (mode === "url" && !url) return;
    if (mode === "upload" && !file) return;

    setIsLoading(true);
    setStatus("idle");
    setErrorMessage("");

    try {
      let response;
      let filename = "audio.mp3";

      if (mode === "url") {
        response = await axios.post("/api/download", { url }, { responseType: "blob" });
      } else {
        const formData = new FormData();
        formData.append("file", file!);
        response = await axios.post("/api/convert", formData, { 
          responseType: "blob",
          headers: { "Content-Type": "multipart/form-data" }
        });
        filename = file!.name.replace(/\.[^/.]+$/, "") + ".mp3";
      }

      // Create a link element to trigger download
      const downloadUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();

      setStatus("success");
      if (mode === "url") setUrl("");
      if (mode === "upload") setFile(null);
    } catch (error: any) {
      console.error("Error downloading/converting audio:", error);
      setStatus("error");
      const errorMsg = error.response?.data?.error 
        ? error.response.data.error 
        : (error.response?.data instanceof Blob 
            ? JSON.parse(await error.response.data.text()).error 
            : "Failed to process request.");
      setErrorMessage(errorMsg || "Failed to download audio. Please check the URL or File.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type.includes("video/mp4") || selectedFile.name.endsWith(".mp4")) {
        setFile(selectedFile);
        setStatus("idle");
      } else {
        setStatus("error");
        setErrorMessage("Please select a valid MP4 video file.");
        setFile(null);
      }
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-slate-50">
      {/* Background blobs for depth */}
      <div className="mesh-gradient" />
      <div className="blob top-[-10%] left-[-10%]" />
      <div className="blob bottom-[-10%] right-[-10%] bg-[rgba(37,99,235,0.05)]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-2xl glass-card p-8 md:p-12 relative z-10"
      >
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-blue-400 mb-6 shadow-lg shadow-blue-500/20"
          >
            <Music className="w-8 h-8 text-white" />
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight text-slate-900">
            Sonic <span className="gradient-text">Extract</span>
          </h1>
          <p className="text-slate-600 text-lg">
            High-quality audio extraction for Instagram Reels, YouTube, or Local MP4s.
          </p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl mb-8">
          <button
            onClick={() => { setMode("url"); setStatus("idle"); }}
            className={`flex-1 py-3 text-sm font-semibold rounded-lg transition-all ${mode === "url" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            Paste Link
          </button>
          <button
            onClick={() => { setMode("upload"); setStatus("idle"); }}
            className={`flex-1 py-3 text-sm font-semibold rounded-lg transition-all ${mode === "upload" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            Upload MP4
          </button>
        </div>

        <div className="space-y-6">
          <AnimatePresence mode="wait">
            {mode === "url" ? (
              <motion.div
                key="url-input"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                className="relative group"
              >
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                  <LinkIcon className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  placeholder="Paste Instagram or YouTube link here..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full bg-white border border-slate-200 shadow-sm rounded-xl py-4 pl-12 pr-4 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                />
              </motion.div>
            ) : (
              <motion.div
                key="upload-input"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${file ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-slate-100'}`}
                >
                  <input 
                    type="file" 
                    accept="video/mp4,.mp4" 
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                  />
                  {file ? (
                    <div className="flex flex-col items-center gap-3 text-blue-700">
                      <FileAudio className="w-10 h-10" />
                      <span className="font-semibold text-lg">{file.name}</span>
                      <span className="text-sm text-blue-500 opacity-80">Ready to convert</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3 text-slate-500">
                      <Upload className="w-10 h-10 mb-2 opacity-50" />
                      <span className="font-semibold">Click to browse or drag MP4 here</span>
                      <span className="text-sm opacity-70">Extract audio instantly from your videos</span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={handleDownload}
            disabled={(mode === "url" ? !url : !file) || isLoading}
            className="w-full neo-button py-4 rounded-xl flex items-center justify-center gap-3 disabled:opacity-50 disabled:transform-none disabled:shadow-none transition-all text-lg font-bold"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                Extracting Magic...
              </>
            ) : (
              <>
                <Download className="w-6 h-6" />
                Download Audio
              </>
            )}
          </button>

          <AnimatePresence>
            {status === "success" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700"
              >
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
                <p>Extraction successful! Your download should start shortly.</p>
              </motion.div>
            )}

            {status === "error" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p>{errorMessage}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-200 flex flex-wrap justify-center gap-8 text-sm text-slate-500 font-medium">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-600" />
            High-bitrate MP3
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-400" />
            Fast Extraction
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-slate-300" />
            No Ads
          </div>
        </div>
      </motion.div>

      <footer className="absolute bottom-6 text-slate-400 text-sm font-medium">
        Made by DevX
      </footer>
    </main>
  );
}
