import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Undo, Redo, Circle, Square, Trash2, Layers, ChevronUp, ChevronDown, Edit3, Droplet, Plus, Minus, Download, Sun, Moon, Menu } from 'lucide-react';

export default function DrawingApp() {
  // Theme state
  const [darkMode, setDarkMode] = useState(false);
  
  // Canvas states
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<'brush' | 'eraser' | 'rectangle' | 'circle'>('brush');
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  
  // History states
  const [history, setHistory] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState(-1);
  
  // Layer states
  const [layers, setLayers] = useState<{id: string, name: string, visible: boolean, data: string}[]>([
    {id: '1', name: 'Layer 1', visible: true, data: ''}
  ]);
  const [activeLayer, setActiveLayer] = useState('1');
  const [layersPanelOpen, setLayersPanelOpen] = useState(false);
  const [colorPanelOpen, setColorPanelOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Welcome modal
  const [showWelcomeModal, setShowWelcomeModal] = useState(true);
  
  // Predefined colors
  const predefinedColors = [
    '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', 
    '#ffff00', '#ff00ff', '#00ffff', '#ff9900', '#9900ff'
  ];

  // Initialize the canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Set canvas dimensions to match parent container
    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        
        // Save the current drawing
        const ctx = canvas.getContext('2d');
        if (ctx) {
          contextRef.current = ctx;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.strokeStyle = color;
          ctx.lineWidth = brushSize;
        }
      }
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  // Update context when brush size or color changes
  useEffect(() => {
    if (contextRef.current) {
      contextRef.current.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
      contextRef.current.lineWidth = brushSize;
    }
  }, [color, brushSize, tool]);

  // Save canvas state to history when drawing ends
  useEffect(() => {
    if (!isDrawing && canvasRef.current) {
      const canvas = canvasRef.current;
      const newData = canvas.toDataURL('image/png');
      
      // Update layer data
      setLayers(prevLayers => 
        prevLayers.map(layer => 
          layer.id === activeLayer ? {...layer, data: newData} : layer
        )
      );
      
      // Update history
      if (currentStep < history.length - 1) {
        // If we're not at the latest step, remove forward history
        setHistory(prevHistory => [...prevHistory.slice(0, currentStep + 1), newData]);
      } else {
        setHistory(prevHistory => [...prevHistory, newData]);
      }
      setCurrentStep(prev => prev + 1);
    }
  }, [isDrawing]);

  // Drawing functions
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!contextRef.current) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    setStartX(x);
    setStartY(y);
    
    if (tool === 'brush' || tool === 'eraser') {
      contextRef.current.beginPath();
      contextRef.current.moveTo(x, y);
    }
    
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !contextRef.current || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
      // Prevent scrolling while drawing on mobile
      e.preventDefault();
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    if (tool === 'brush' || tool === 'eraser') {
      contextRef.current.lineTo(x, y);
      contextRef.current.stroke();
    } else if (tool === 'rectangle' || tool === 'circle') {
      // Clear canvas and redraw the previous state
      const ctx = contextRef.current;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Redraw current layer
      const activeLayerData = layers.find(layer => layer.id === activeLayer)?.data;
      if (activeLayerData) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0);
          
          // Draw the current shape
          ctx.strokeStyle = color;
          ctx.lineWidth = brushSize;
          ctx.beginPath();
          
          if (tool === 'rectangle') {
            ctx.rect(startX, startY, x - startX, y - startY);
          } else if (tool === 'circle') {
            const radiusX = Math.abs(x - startX);
            const radiusY = Math.abs(y - startY);
            const radius = Math.max(radiusX, radiusY);
            ctx.arc(startX, startY, radius, 0, 2 * Math.PI);
          }
          
          ctx.stroke();
        };
        img.src = activeLayerData;
      }
    }
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    if (contextRef.current) {
      contextRef.current.closePath();
    }
    setIsDrawing(false);
  };

  // Undo/Redo functions
  const undo = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      drawFromHistory(currentStep - 1);
    }
  };

  const redo = () => {
    if (currentStep < history.length - 1) {
      setCurrentStep(prev => prev + 1);
      drawFromHistory(currentStep + 1);
    }
  };

  const drawFromHistory = (step: number) => {
    if (!canvasRef.current || !contextRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (step >= 0 && history[step]) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        
        // Update active layer data
        setLayers(prevLayers => 
          prevLayers.map(layer => 
            layer.id === activeLayer ? {...layer, data: history[step]} : layer
          )
        );
      };
      img.src = history[step];
    }
  };

  // Clear canvas
  const clearCanvas = () => {
    if (!canvasRef.current || !contextRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Save the cleared state to history
    const clearedData = canvas.toDataURL('image/png');
    setHistory(prevHistory => [...prevHistory, clearedData]);
    setCurrentStep(prev => prev + 1);
    
    // Update active layer data
    setLayers(prevLayers => 
      prevLayers.map(layer => 
        layer.id === activeLayer ? {...layer, data: clearedData} : layer
      )
    );
  };

  // Layer functions
  const addLayer = () => {
    const newId = (parseInt(layers[layers.length - 1]?.id || '0') + 1).toString();
    const newLayer = {
      id: newId,
      name: `Layer ${newId}`,
      visible: true,
      data: canvasRef.current?.toDataURL('image/png') || ''
    };
    
    setLayers(prev => [...prev, newLayer]);
    setActiveLayer(newId);
  };

  const toggleLayerVisibility = (id: string) => {
    setLayers(prevLayers => 
      prevLayers.map(layer => 
        layer.id === id ? {...layer, visible: !layer.visible} : layer
      )
    );
  };

  const switchLayer = (id: string) => {
    // Save current canvas to current layer
    if (canvasRef.current) {
      const currentData = canvasRef.current.toDataURL('image/png');
      setLayers(prevLayers => 
        prevLayers.map(layer => 
          layer.id === activeLayer ? {...layer, data: currentData} : layer
        )
      );
    }
    
    // Switch to selected layer
    setActiveLayer(id);
    
    // Load selected layer data
    const selectedLayer = layers.find(layer => layer.id === id);
    if (selectedLayer && selectedLayer.data && canvasRef.current && contextRef.current) {
      const img = new Image();
      img.onload = () => {
        contextRef.current?.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
        contextRef.current?.drawImage(img, 0, 0);
      };
      img.src = selectedLayer.data;
    }
  };

  // Download function
  const downloadImage = () => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const dataURL = canvas.toDataURL('image/png');
    
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = 'drawing.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={`min-h-screen flex flex-col ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet"></link>
      {/* Welcome Modal */}
      <AnimatePresence>
        {showWelcomeModal && (
          <motion.div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className={`${darkMode ? 'bg-gray-800' : 'bg-white'} p-8 rounded-lg max-w-md w-full shadow-2xl`}
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              transition={{ type: 'spring', damping: 20 }}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Welcome to SketchPro</h2>
                <button 
                  onClick={() => setShowWelcomeModal(false)} 
                  className={`p-1 rounded-full ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
                >
                  <X size={20} />
                </button>
              </div>
              <p className="mb-4">Create beautiful digital artwork with our professional drawing tools:</p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center">
                  <Edit3 size={18} className="mr-2 text-blue-500" />
                  <span>Draw freehand with customizable brush sizes</span>
                </li>
                <li className="flex items-center">
                  <Square size={18} className="mr-2 text-green-500" />
                  <span>Create perfect shapes with rectangle and circle tools</span>
                </li>
                <li className="flex items-center">
                  <Layers size={18} className="mr-2 text-purple-500" />
                  <span>Organize your artwork with multiple layers</span>
                </li>
                <li className="flex items-center">
                  <Droplet size={18} className="mr-2 text-red-500" />
                  <span>Choose from a variety of colors or pick your own</span>
                </li>
                <li className="flex items-center">
                  <Download size={18} className="mr-2 text-orange-500" />
                  <span>Save your masterpiece with one click</span>
                </li>
              </ul>
              <motion.button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium shadow-lg"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowWelcomeModal(false)}
              >
                Start Drawing
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Bar */}
      <nav className={`flex justify-between items-center px-4 py-4 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-md`}>
        <div className="flex items-center">
          <h1 className="text-xl md:text-2xl font-bold">
            <span className="text-blue-600">Sketch</span>Pro
          </h1>
        </div>
        
        <div className="hidden md:flex items-center space-x-6">
          <button 
            onClick={() => setColorPanelOpen(!colorPanelOpen)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${colorPanelOpen ? 'bg-blue-100 text-blue-600' : ''} ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
          >
            <Droplet size={18} />
            <span>Colors</span>
          </button>
          
          <button 
            onClick={() => setLayersPanelOpen(!layersPanelOpen)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${layersPanelOpen ? 'bg-blue-100 text-blue-600' : ''} ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
          >
            <Layers size={18} />
            <span>Layers</span>
          </button>
          
          <button 
            onClick={downloadImage}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
          >
            <Save size={18} />
            <span>Save</span>
          </button>
          
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className={`flex items-center justify-center w-10 h-10 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
        
        {/* Mobile menu button */}
        <button 
          className="md:hidden flex items-center" 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>
      
      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            className="md:hidden fixed inset-0 z-40 bg-black bg-opacity-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className={`absolute right-0 top-0 h-full w-64 shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25 }}
            >
              <div className="p-4 space-y-4">
               <button 
  onClick={() => {
    setColorPanelOpen(!colorPanelOpen);
    setIsMobileMenuOpen(false);
  }}
  className={`flex items-center space-x-4 w-full px-3 py-3 rounded-lg ${colorPanelOpen ? 'bg-blue-100 text-blue-600' : ''} ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
>
  <Droplet size={20} />
  <span>Colors</span>
</button>

<button 
  onClick={() => {
    setLayersPanelOpen(!layersPanelOpen);
    setIsMobileMenuOpen(false);
  }}
  className={`flex items-center space-x-4 w-full px-3 py-3 rounded-lg ${layersPanelOpen ? 'bg-blue-100 text-blue-600' : ''} ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
>
  <Layers size={20} />
  <span>Layers</span>
</button>

                
                <button 
                  onClick={() => {downloadImage(); setIsMobileMenuOpen(false);}}
                  className={`flex items-center space-x-4 w-full px-3 py-3 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                >
                  <Save size={20} />
                  <span>Save</span>
                </button>
                
                <button 
                  onClick={() => {setDarkMode(!darkMode); setIsMobileMenuOpen(false);}}
                  className={`flex items-center space-x-4 w-full px-3 py-3 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                >
                  {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                  <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Drawing Tools */}
        <motion.div 
          className={`flex flex-col items-center py-4 px-2 gap-4 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-md`}
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <motion.button
            className={`p-2 rounded-lg ${tool === 'brush' ? 'bg-blue-100 text-blue-600' : darkMode ? 'text-white' : 'text-gray-700'} ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
            onClick={() => setTool('brush')}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title="Brush"
          >
            <Edit3 size={24} />
          </motion.button>
          
          <motion.button
            className={`p-2 rounded-lg ${tool === 'eraser' ? 'bg-blue-100 text-blue-600' : darkMode ? 'text-white' : 'text-gray-700'} ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
            onClick={() => setTool('eraser')}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title="Eraser"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 20H9L4 15L15 4L21 10L20 20Z" />
              <path d="M9 20H4V15" />
            </svg>
          </motion.button>
          
          <motion.button
            className={`p-2 rounded-lg ${tool === 'rectangle' ? 'bg-blue-100 text-blue-600' : darkMode ? 'text-white' : 'text-gray-700'} ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
            onClick={() => setTool('rectangle')}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title="Rectangle"
          >
            <Square size={24} />
          </motion.button>
          
          <motion.button
            className={`p-2 rounded-lg ${tool === 'circle' ? 'bg-blue-100 text-blue-600' : darkMode ? 'text-white' : 'text-gray-700'} ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
            onClick={() => setTool('circle')}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title="Circle"
          >
            <Circle size={24} />
          </motion.button>
          
          <div className="h-px w-8 bg-gray-300 my-1"></div>
          
          <motion.button
            className={`p-2 rounded-lg ${darkMode ? 'text-white hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}
            onClick={undo}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            disabled={currentStep <= 0}
            title="Undo"
          >
            <Undo size={24} className={currentStep <= 0 ? 'opacity-40' : ''} />
          </motion.button>
          
          <motion.button
            className={`p-2 rounded-lg ${darkMode ? 'text-white hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}
            onClick={redo}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            disabled={currentStep >= history.length - 1}
            title="Redo"
          >
            <Redo size={24} className={currentStep >= history.length - 1 ? 'opacity-40' : ''} />
          </motion.button>
          
          <motion.button
            className={`p-2 rounded-lg ${darkMode ? 'text-white hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}
            onClick={clearCanvas}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title="Clear Canvas"
          >
            <Trash2 size={24} />
          </motion.button>
          
          <div className="h-px w-8 bg-gray-300 my-1"></div>
          
          <div className="flex flex-col items-center">
            <motion.button
              className={`p-1 rounded-lg ${darkMode ? 'text-white hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}
              onClick={() => setBrushSize(prev => Math.min(prev + 1, 30))}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              title="Increase Size"
            >
              <Plus size={18} />
            </motion.button>
            
            <div className={`text-xs my-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {brushSize}px
            </div>
            
            <motion.button
              className={`p-1 rounded-lg ${darkMode ? 'text-white hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}
              onClick={() => setBrushSize(prev => Math.max(prev - 1, 1))}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              title="Decrease Size"
            >
              <Minus size={18} />
            </motion.button>
          </div>
          
          <div 
            className="w-8 h-8 rounded-full border-2 border-gray-300 cursor-pointer mt-2"
            style={{ backgroundColor: color }}
            onClick={() => setColorPanelOpen(!colorPanelOpen)}
          ></div>
        </motion.div>

        {/* Canvas Container */}
        <div className="flex-1 relative overflow-hidden">
          <canvas
            ref={canvasRef}
            className={`w-full h-full ${darkMode ? 'bg-gray-700' : 'bg-white'} cursor-crosshair`}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
          
          {/* Color Panel */}
          <AnimatePresence>
            {colorPanelOpen && (
              <motion.div 
                className={`absolute bottom-4 left-1/2 transform -translate-x-1/2 p-4 rounded-lg shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 50, opacity: 0 }}
              >
                <div className="flex flex-wrap gap-2 justify-center mb-3">
                  {predefinedColors.map((c) => (
                    <motion.div
                      key={c}
                      className="w-8 h-8 rounded-full cursor-pointer border-2"
                      style={{ 
                        backgroundColor: c,
                        borderColor: color === c ? '#3B82F6' : 'transparent'
                      }}
                      onClick={() => setColor(c)}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                    />
                  ))}
                </div>
                <div className={`flex items-center justify-center pt-2 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <label className={`text-sm mr-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Custom:</label>
                  <input 
                    type="color" 
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-8 h-8 cursor-pointer border-0"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Layers Panel */}
          <AnimatePresence>
            {layersPanelOpen && (
              <motion.div 
                className={`absolute top-4 right-4 p-4 rounded-lg shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} border ${darkMode ? 'border-gray-700' : 'border-gray-200'} w-64`}
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 50, opacity: 0 }}
              >
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-medium">Layers</h3>
                  <motion.button
                    className={`p-1 rounded-full ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                    onClick={addLayer}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    title="Add Layer"
                  >
                    <Plus size={16} />
                  </motion.button>
                </div>
                
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {layers.map((layer) => (
                    <motion.div 
                      key={layer.id}
                      className={`p-2 rounded-md flex items-center justify-between cursor-pointer ${activeLayer === layer.id ? (darkMode ? 'bg-gray-700' : 'bg-blue-50') : ''}`} 
                      onClick={() => switchLayer(layer.id)}
                      whileHover={{ scale: 1.02 }}
                    >
                      <div className="flex items-center">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleLayerVisibility(layer.id);
                          }}
                          className="mr-2"
                        >
                          {layer.visible ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                              <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                              <line x1="1" y1="1" x2="23" y2="23"></line>
                            </svg>
                          )}
                        </button>
                        <span className={`text-sm ${!layer.visible ? 'opacity-50' : ''}`}>{layer.name}</span>
                      </div>
                      {activeLayer === layer.id && (
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom Toolbar (Mobile) */}
      <div className={`md:hidden flex justify-around items-center p-3 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-top`}>
        <motion.button
          className={`p-2 rounded-full ${tool === 'brush' ? 'bg-blue-100 text-blue-600' : ''}`}
          onClick={() => setTool('brush')}
          whileTap={{ scale: 0.9 }}
        >
          <Edit3 size={20} />
        </motion.button>
        
        <motion.button
          className={`p-2 rounded-full ${tool === 'eraser' ? 'bg-blue-100 text-blue-600' : ''}`}
          onClick={() => setTool('eraser')}
          whileTap={{ scale: 0.9 }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 20H9L4 15L15 4L21 10L20 20Z" />
            <path d="M9 20H4V15" />
          </svg>
        </motion.button>
        
        <motion.button
          className={`p-2 rounded-full ${tool === 'rectangle' ? 'bg-blue-100 text-blue-600' : ''}`}
          onClick={() => setTool('rectangle')}
          whileTap={{ scale: 0.9 }}
        >
          <Square size={20} />
        </motion.button>
        
        <motion.button
          className={`p-2 rounded-full ${tool === 'circle' ? 'bg-blue-100 text-blue-600' : ''}`}
          onClick={() => setTool('circle')}
          whileTap={{ scale: 0.9 }}
        >
          <Circle size={20} />
        </motion.button>
        
        <motion.button
          className="p-2 rounded-full"
          onClick={clearCanvas}
          whileTap={{ scale: 0.9 }}
        >
          <Trash2 size={20} />
        </motion.button>
      </div>
    </div>
  );
}
