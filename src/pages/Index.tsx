
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, Image as ImageIcon, Wand2, Download, Key, Loader2, AlertCircle, CheckCircle, Moon, Sun, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';

const Index = () => {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [prompt, setPrompt] = useState('');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedImageName, setUploadedImageName] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info' | null; message: string }>({ type: null, message: '' });
  const [mode, setMode] = useState<'text-to-image' | 'image-to-image'>('text-to-image');
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('dark-mode') === 'true');
  const [autoEnhancePrompt, setAutoEnhancePrompt] = useState(() => localStorage.getItem('auto-enhance') === 'true');
  const [isEnhancing, setIsEnhancing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);
  const [isDragging, setIsDragging] = useState(false);

  // Apply dark mode
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('dark-mode', isDarkMode.toString());
  }, [isDarkMode]);

  // Save auto enhance preference
  useEffect(() => {
    localStorage.setItem('auto-enhance', autoEnhancePrompt.toString());
  }, [autoEnhancePrompt]);

  // Save API key to localStorage
  const handleApiKeyChange = (value: string) => {
    setApiKey(value);
    localStorage.setItem('gemini_api_key', value);
  };

  // Enhance prompt using Gemini API
  const enhancePrompt = async (originalPrompt: string): Promise<string> => {
    if (!apiKey.trim() || !originalPrompt.trim()) return originalPrompt;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `Enhance this image generation prompt to be more descriptive and artistic while keeping the original intent. Make it more detailed for better AI image generation. Original prompt: "${originalPrompt}"`
              }]
            }],
            generationConfig: {
              maxOutputTokens: 200,
              temperature: 0.7
            }
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        const enhancedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        return enhancedText || originalPrompt;
      }
    } catch (error) {
      console.log('Prompt enhancement failed, using original prompt');
    }
    
    return originalPrompt;
  };

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setStatus({ type: 'error', message: 'Please upload a valid image file (JPEG, PNG, WebP)' });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setStatus({ type: 'error', message: 'Image file size must be less than 10MB' });
      return;
    }

    try {
      const base64 = await fileToBase64(file);
      setUploadedImage(base64);
      setUploadedImageName(file.name);
      setMode('image-to-image');
      setStatus({ type: 'success', message: `Image "${file.name}" uploaded successfully` });
    } catch (error) {
      setStatus({ type: 'error', message: 'Failed to process image file' });
    }
  };

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleFileUpload(file);
    }
  }, []);

  // Generate image using Gemini API
  const generateImage = async () => {
    if (!apiKey.trim()) {
      setStatus({ type: 'error', message: 'Please enter your Google API Key' });
      return;
    }

    if (!prompt.trim()) {
      setStatus({ type: 'error', message: 'Please enter a prompt' });
      return;
    }

    if (mode === 'image-to-image' && !uploadedImage) {
      setStatus({ type: 'error', message: 'Please upload an image for image-to-image mode' });
      return;
    }

    setIsLoading(true);
    setStatus({ type: 'info', message: 'Generating image...' });

    try {
      let finalPrompt = prompt;
      
      // Enhance prompt if auto-enhance is enabled
      if (autoEnhancePrompt) {
        setIsEnhancing(true);
        setStatus({ type: 'info', message: 'Enhancing prompt...' });
        finalPrompt = await enhancePrompt(prompt);
        setIsEnhancing(false);
        setStatus({ type: 'info', message: 'Generating image...' });
      }

      const requestBody: any = {
        contents: [{
          parts: [
            { text: finalPrompt }
          ]
        }],
        generationConfig: { responseModalities: ["TEXT", "IMAGE"] }
      };

      if (mode === 'image-to-image' && uploadedImage) {
        requestBody.contents[0].parts.push({
          inline_data: {
            mime_type: "image/jpeg",
            data: uploadedImage
          }
        });
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      const imagePart = data.candidates?.[0]?.content?.parts?.find((part: any) => part.inlineData);
      
      if (imagePart?.inlineData?.data) {
        setGeneratedImage(imagePart.inlineData.data);
        setStatus({ type: 'success', message: 'Image generated successfully!' });
      } else {
        throw new Error('No image data found in the response');
      }
    } catch (error: any) {
      console.error('Error generating image:', error);
      setStatus({ 
        type: 'error', 
        message: error.message || 'Failed to generate image. Please check your API key and try again.' 
      });
    } finally {
      setIsLoading(false);
      setIsEnhancing(false);
    }
  };

  // Download generated image
  const downloadImage = () => {
    if (!generatedImage) return;
    
    const link = document.createElement('a');
    link.href = `data:image/jpeg;base64,${generatedImage}`;
    link.download = `swap-creations-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDarkMode 
        ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900' 
        : 'bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900'
    }`}>
      {/* Navbar */}
      <nav className="bg-black/20 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <Wand2 className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white">Swap Creations</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Auto Enhance Toggle */}
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-purple-300" />
              <span className="text-sm text-purple-200">Auto Enhance</span>
              <Switch
                checked={autoEnhancePrompt}
                onCheckedChange={setAutoEnhancePrompt}
              />
            </div>
            
            {/* Dark Mode Toggle */}
            <div className="flex items-center space-x-2">
              <Sun className="w-4 h-4 text-yellow-400" />
              <Switch
                checked={isDarkMode}
                onCheckedChange={setIsDarkMode}
              />
              <Moon className="w-4 h-4 text-blue-300" />
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto p-6">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Input Panel */}
          <div className="space-y-6">
            {/* API Key Input */}
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Key className="w-5 h-5" />
                  API Configuration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  type="password"
                  placeholder="Enter your Google API Key"
                  value={apiKey}
                  onChange={(e) => handleApiKeyChange(e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder-white/60"
                />
                <p className="text-sm text-purple-200 mt-2">
                  Your API key is stored locally and never sent to our servers
                </p>
              </CardContent>
            </Card>

            {/* Mode Selection */}
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Generation Mode</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant={mode === 'text-to-image' ? 'default' : 'outline'}
                    onClick={() => setMode('text-to-image')}
                    className={mode === 'text-to-image' 
                      ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                      : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                    }
                  >
                    <Wand2 className="w-4 h-4 mr-2" />
                    Text to Image
                  </Button>
                  <Button
                    variant={mode === 'image-to-image' ? 'default' : 'outline'}
                    onClick={() => setMode('image-to-image')}
                    className={mode === 'image-to-image' 
                      ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                      : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                    }
                  >
                    <ImageIcon className="w-4 h-4 mr-2" />
                    Image to Image
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Image Upload (Image-to-Image mode) */}
            {mode === 'image-to-image' && (
              <Card className="bg-white/10 backdrop-blur-lg border-white/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Upload className="w-5 h-5" />
                    Upload Source Image
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 cursor-pointer ${
                      isDragging 
                        ? 'border-purple-400 bg-purple-400/20' 
                        : 'border-white/30 hover:border-purple-400 hover:bg-white/5'
                    }`}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploadedImage ? (
                      <div className="space-y-4">
                        <img
                          src={`data:image/jpeg;base64,${uploadedImage}`}
                          alt="Uploaded"
                          className="max-w-full max-h-48 mx-auto rounded-lg shadow-lg"
                        />
                        <p className="text-purple-200">{uploadedImageName}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setUploadedImage(null);
                            setUploadedImageName('');
                          }}
                          className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                        >
                          Remove Image
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <Upload className="w-12 h-12 mx-auto text-white/60" />
                        <div>
                          <p className="text-white font-medium">
                            {isDragging ? 'Drop image here' : 'Click to upload or drag and drop'}
                          </p>
                          <p className="text-purple-200 text-sm mt-1">
                            JPEG, PNG, WebP (max 10MB)
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                    className="hidden"
                  />
                </CardContent>
              </Card>
            )}

            {/* Prompt Input */}
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-white">
                  <span>Prompt</span>
                  {autoEnhancePrompt && (
                    <div className="flex items-center gap-2 text-sm text-purple-300">
                      <Sparkles className="w-4 h-4" />
                      Auto Enhancement: ON
                      {isEnhancing && <Loader2 className="w-4 h-4 animate-spin" />}
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder={
                    mode === 'text-to-image' 
                      ? 'Describe the image you want to generate...' 
                      : 'Describe how you want to transform the uploaded image...'
                  }
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={4}
                  className="bg-white/10 border-white/20 text-white placeholder-white/60 resize-none"
                />
                {autoEnhancePrompt && (
                  <p className="text-xs text-purple-300 mt-2">
                    ✨ Your prompt will be automatically enhanced for better results
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Generate Button */}
            <Button
              onClick={generateImage}
              disabled={isLoading || !apiKey.trim() || !prompt.trim()}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-6 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  {isEnhancing ? 'Enhancing Prompt...' : 'Generating...'}
                </>
              ) : (
                <>
                  <Wand2 className="w-5 h-5 mr-2" />
                  {mode === 'text-to-image' ? 'Generate Image' : 'Transform Image'}
                </>
              )}
            </Button>
          </div>

          {/* Output Panel */}
          <div className="space-y-6">
            {/* Status Messages */}
            {status.type && (
              <Alert className={`border-2 ${
                status.type === 'error' 
                  ? 'bg-red-900/20 border-red-500/50 text-red-200' 
                  : status.type === 'success'
                  ? 'bg-green-900/20 border-green-500/50 text-green-200'
                  : 'bg-blue-900/20 border-blue-500/50 text-blue-200'
              }`}>
                {status.type === 'error' && <AlertCircle className="h-4 w-4" />}
                {status.type === 'success' && <CheckCircle className="h-4 w-4" />}
                {status.type === 'info' && <Loader2 className="h-4 w-4 animate-spin" />}
                <AlertDescription>{status.message}</AlertDescription>
              </Alert>
            )}

            {/* Generated Image Display */}
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-white">
                  <span className="flex items-center gap-2">
                    <ImageIcon className="w-5 h-5" />
                    Generated Image
                  </span>
                  {generatedImage && (
                    <Button
                      onClick={downloadImage}
                      variant="outline"
                      size="sm"
                      className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-square bg-white/5 rounded-lg border-2 border-dashed border-white/20 flex items-center justify-center min-h-[400px]">
                  {generatedImage ? (
                    <img
                      src={`data:image/jpeg;base64,${generatedImage}`}
                      alt="Generated"
                      className="max-w-full max-h-full rounded-lg shadow-2xl"
                    />
                  ) : (
                    <div className="text-center text-white/60">
                      <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium">Your generated image will appear here</p>
                      <p className="text-sm mt-2">
                        {mode === 'text-to-image' 
                          ? 'Enter a prompt and click "Generate Image"' 
                          : 'Upload an image, enter a prompt, and click "Transform Image"'
                        }
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-purple-200">
          <p className="text-sm">
            Powered by Google Gemini 2.0 Flash • Built with React & Tailwind CSS
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
