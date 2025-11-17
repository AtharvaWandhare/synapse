import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Node {
  id: string;
  label: string;
  type: 'skill' | 'checkpoint' | 'project';
  status?: 'completed' | 'in_progress' | 'to_learn';
  description?: string;
}

interface Track {
  id: string;
  name: string;
  color: string;
  nodes: Node[];
}

interface Connection {
  from: string;
  to: string;
}

interface Checkpoint {
  id: string;
  label: string;
  type: string;
  description?: string;
  connectedNodes?: string[];
}

interface RoadmapData {
  title: string;
  description?: string;
  tracks: Track[];
  checkpoints?: Checkpoint[];
  connections: Connection[];
  projects?: Node[];
}

interface RoadmapFlowchartProps {
  data: RoadmapData;
}

type LayoutDensity = 'compact' | 'comfortable' | 'spacious';
type TextSize = 'small' | 'normal' | 'large';

const RoadmapFlowchart: React.FC<RoadmapFlowchartProps> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [positions, setPositions] = useState<Map<string, { x: number; y: number }>>(new Map());
  const [layoutDensity, setLayoutDensity] = useState<LayoutDensity>('comfortable');
  const [textSize, setTextSize] = useState<TextSize>('normal');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Text size multipliers
  const textSizeMultipliers: Record<TextSize, number> = {
    small: 0.85,
    normal: 1.0,
    large: 1.2
  };
  
  const textMultiplier = textSizeMultipliers[textSize];
  
  // Base layout constants (adjusted by text size)
  const BASE_NODE_HEIGHT = Math.round(96 * textMultiplier);
  const BASE_PADDING = Math.round(24 * textMultiplier);
  const CHAR_WIDTH = Math.round(10 * textMultiplier);
  const MIN_NODE_WIDTH = Math.round(160 * textMultiplier);
  const MAX_NODE_WIDTH = Math.round(340 * textMultiplier);
  
  // Density multipliers
  const densityMultipliers: Record<LayoutDensity, number> = {
    compact: 0.75,
    comfortable: 1.0,
    spacious: 1.35
  };
  
  const multiplier = densityMultipliers[layoutDensity];
  const TRACK_SPACING = Math.round(404 * multiplier);
  const NODE_SPACING = Math.round(288 * multiplier);
  const START_X = 100;
  const START_Y = 120;

  // Calculate dynamic node widths based on label length
  const nodeWidths = useMemo(() => {
    const widths = new Map<string, number>();
    
    // Calculate for track nodes
    data.tracks.forEach(track => {
      track.nodes.forEach(node => {
        const estimatedWidth = Math.min(MAX_NODE_WIDTH, Math.max(MIN_NODE_WIDTH, node.label.length * CHAR_WIDTH + BASE_PADDING));
        widths.set(node.id, estimatedWidth);
      });
    });
    
    // Calculate for checkpoints (wider by default)
    data.checkpoints?.forEach(checkpoint => {
      const estimatedWidth = Math.min(MAX_NODE_WIDTH + 60, Math.max(MIN_NODE_WIDTH + 40, checkpoint.label.length * CHAR_WIDTH + BASE_PADDING));
      widths.set(checkpoint.id, estimatedWidth);
    });
    
    // Calculate for projects
    data.projects?.forEach(project => {
      const estimatedWidth = Math.min(MAX_NODE_WIDTH, Math.max(MIN_NODE_WIDTH, project.label.length * CHAR_WIDTH + BASE_PADDING));
      widths.set(project.id, estimatedWidth);
    });
    
    return widths;
  }, [data, MIN_NODE_WIDTH, MAX_NODE_WIDTH, CHAR_WIDTH, BASE_PADDING]);

  useEffect(() => {
    calculatePositions();
  }, [data, layoutDensity, textSize]);

  // Zoom and pan handlers
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.001;
    const newZoom = Math.min(Math.max(0.3, zoom + delta), 3);
    setZoom(newZoom);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) { // Left click only
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const calculatePositions = () => {
    const newPositions = new Map<string, { x: number; y: number }>();
    const occupiedSpaces: Array<{ x1: number; x2: number; y1: number; y2: number }> = [];
    
    // Helper function to check if a position overlaps with occupied spaces
    const hasOverlap = (x: number, y: number, width: number, height: number) => {
      return occupiedSpaces.some(space => 
        !(x + width < space.x1 || x > space.x2 || y + height < space.y1 || y > space.y2)
      );
    };
    
    // Helper to find next available X position
    const findAvailableX = (startX: number, y: number, width: number, height: number) => {
      let x = startX;
      const maxIterations = 50;
      let iterations = 0;
      
      while (hasOverlap(x, y, width, height) && iterations < maxIterations) {
        x += NODE_SPACING * 0.5;
        iterations++;
      }
      
      return x;
    };
    
    // Position track nodes with improved collision detection
    data.tracks.forEach((track, trackIndex) => {
      const y = START_Y + trackIndex * TRACK_SPACING;
      let cumulativeX = START_X;
      
      track.nodes.forEach((node) => {
        const nodeWidth = nodeWidths.get(node.id) || MIN_NODE_WIDTH;
        const availableX = findAvailableX(cumulativeX, y, nodeWidth, BASE_NODE_HEIGHT);
        
        newPositions.set(node.id, { x: availableX, y });
        occupiedSpaces.push({
          x1: availableX,
          x2: availableX + nodeWidth,
          y1: y,
          y2: y + BASE_NODE_HEIGHT
        });
        
        cumulativeX = availableX + nodeWidth + NODE_SPACING;
      });
    });

    // Position checkpoints with enhanced collision avoidance
    if (data.checkpoints) {
      data.checkpoints.forEach((checkpoint, index) => {
        const checkpointWidth = nodeWidths.get(checkpoint.id) || (MIN_NODE_WIDTH + 40);
        const connectedPositions = checkpoint.connectedNodes
          ?.map(nodeId => newPositions.get(nodeId))
          .filter(pos => pos !== undefined) || [];
        
        if (connectedPositions.length > 0) {
          const avgX = connectedPositions.reduce((sum, pos) => sum + pos!.x, 0) / connectedPositions.length;
          const avgY = connectedPositions.reduce((sum, pos) => sum + pos!.y, 0) / connectedPositions.length;
          
          // Offset checkpoints vertically to avoid overlapping with track nodes
          const verticalOffset = TRACK_SPACING * 0.4;
          let checkpointY = avgY + verticalOffset;
          let checkpointX = avgX + NODE_SPACING * 0.3;
          
          // Find non-overlapping position
          checkpointX = findAvailableX(checkpointX, checkpointY, checkpointWidth, BASE_NODE_HEIGHT);
          
          newPositions.set(checkpoint.id, { x: checkpointX, y: checkpointY });
          occupiedSpaces.push({
            x1: checkpointX,
            x2: checkpointX + checkpointWidth,
            y1: checkpointY,
            y2: checkpointY + BASE_NODE_HEIGHT
          });
        } else {
          const x = START_X + index * NODE_SPACING * 1.2;
          const y = START_Y + data.tracks.length * TRACK_SPACING / 2;
          
          newPositions.set(checkpoint.id, { x, y });
          occupiedSpaces.push({
            x1: x,
            x2: x + checkpointWidth,
            y1: y,
            y2: y + BASE_NODE_HEIGHT
          });
        }
      });
    }

    // Position projects at the bottom with collision avoidance
    if (data.projects) {
      const projectY = START_Y + (data.tracks.length + 0.7) * TRACK_SPACING;
      let cumulativeX = START_X;
      
      data.projects.forEach((project) => {
        const projectWidth = nodeWidths.get(project.id) || MIN_NODE_WIDTH;
        const availableX = findAvailableX(cumulativeX, projectY, projectWidth, BASE_NODE_HEIGHT);
        
        newPositions.set(project.id, { x: availableX, y: projectY });
        occupiedSpaces.push({
          x1: availableX,
          x2: availableX + projectWidth,
          y1: projectY,
          y2: projectY + BASE_NODE_HEIGHT
        });
        
        cumulativeX = availableX + projectWidth + NODE_SPACING * 1.2;
      });
    }

    setPositions(newPositions);
  };

  const getNodeColor = (node: Node, track?: Track) => {
    if (node.type === 'checkpoint') return '#6b7280';
    if (node.type === 'project') return '#000000';
    if (node.status === 'completed') return '#10b981';
    return track?.color || '#fbbf24';
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    const variants: Record<string, string> = {
      completed: 'bg-green-500 text-white',
      in_progress: 'bg-blue-500 text-white',
      to_learn: 'bg-gray-400 text-white'
    };
    return (
      <Badge className={`text-xs ${variants[status] || ''}`}>
        {status === 'to_learn' ? 'To Learn' : status.replace('_', ' ')}
      </Badge>
    );
  };

  const drawConnection = (from: string, to: string) => {
    const fromPos = positions.get(from);
    const toPos = positions.get(to);
    
    if (!fromPos || !toPos) return null;

    const fromWidth = nodeWidths.get(from) || MIN_NODE_WIDTH;

    const x1 = fromPos.x + fromWidth;
    const y1 = fromPos.y + BASE_NODE_HEIGHT / 2;
    const x2 = toPos.x;
    const y2 = toPos.y + BASE_NODE_HEIGHT / 2;

    // Create curved path
    const midX = (x1 + x2) / 2;
    const path = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;

    const isDashed = Math.abs(toPos.y - fromPos.y) > 10;

    return (
      <g key={`${from}-${to}`}>
        {/* Shadow/outline for better visibility */}
        <path
          d={path}
          stroke="#000000"
          strokeWidth="5"
          fill="none"
          opacity="0.1"
          strokeDasharray={isDashed ? "5,5" : "0"}
        />
        {/* Main connection line */}
        <path
          d={path}
          stroke="#475569"
          strokeWidth="4"
          fill="none"
          strokeDasharray={isDashed ? "8,4" : "0"}
          markerEnd="url(#arrowhead)"
        />
      </g>
    );
  };

  // Calculate viewBox based on actual node positions and widths
  const viewBoxWidth = useMemo(() => {
    let maxX = 1600;
    positions.forEach((pos, id) => {
      const width = nodeWidths.get(id) || MIN_NODE_WIDTH;
      maxX = Math.max(maxX, pos.x + width + 200);
    });
    return maxX;
  }, [positions, nodeWidths, MIN_NODE_WIDTH]);

  const viewBoxHeight = START_Y + (data.tracks.length + (data.projects ? 2 : 1.5)) * TRACK_SPACING + 100;
  const viewBox = `0 0 ${viewBoxWidth} ${viewBoxHeight}`;

  // Get text size classes based on current setting
  const getTextClass = (base: 'sm' | 'base' | 'lg' | 'xl') => {
    const sizeMap = {
      small: { sm: 'text-xs', base: 'text-sm', lg: 'text-base', xl: 'text-lg' },
      normal: { sm: 'text-sm', base: 'text-base', lg: 'text-lg', xl: 'text-xl' },
      large: { sm: 'text-base', base: 'text-lg', lg: 'text-xl', xl: 'text-2xl' }
    };
    return sizeMap[textSize][base];
  };

  return (
    <div className="w-full overflow-auto">
      <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
        <div className="text-left">
          <h2 className="text-2xl font-bold mb-2">{data.title}</h2>
          {data.description && (
            <p className="text-gray-600 text-base max-w-3xl">{data.description}</p>
          )}
        </div>
        
        <div className="flex flex-col gap-3">
          {/* Text Size Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 mr-2">Text Size:</span>
            <Button
              size="sm"
              variant={textSize === 'small' ? 'default' : 'outline'}
              onClick={() => setTextSize('small')}
            >
              Small
            </Button>
            <Button
              size="sm"
              variant={textSize === 'normal' ? 'default' : 'outline'}
              onClick={() => setTextSize('normal')}
            >
              Normal
            </Button>
            <Button
              size="sm"
              variant={textSize === 'large' ? 'default' : 'outline'}
              onClick={() => setTextSize('large')}
            >
              Large
            </Button>
          </div>
          
          {/* Layout Density Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 mr-2">Layout:</span>
            <Button
              size="sm"
              variant={layoutDensity === 'compact' ? 'default' : 'outline'}
              onClick={() => setLayoutDensity('compact')}
            >
              Compact
            </Button>
            <Button
              size="sm"
              variant={layoutDensity === 'comfortable' ? 'default' : 'outline'}
              onClick={() => setLayoutDensity('comfortable')}
            >
              Comfortable
            </Button>
            <Button
              size="sm"
              variant={layoutDensity === 'spacious' ? 'default' : 'outline'}
              onClick={() => setLayoutDensity('spacious')}
            >
              Spacious
            </Button>
          </div>
          
          {/* Zoom Controls */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 mr-2">Zoom: {Math.round(zoom * 100)}%</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setZoom(Math.max(0.3, zoom - 0.1))}
            >
              −
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setZoom(Math.min(3, zoom + 0.1))}
            >
              +
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={resetView}
            >
              Reset
            </Button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mb-6 flex gap-6 flex-wrap">
        {data.tracks.map(track => (
          <div key={track.id} className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: track.color }}></div>
              <span className="text-base font-medium">{track.name}</span>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gray-500"></div>
          <span className="text-base font-medium">Checkpoints</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-black"></div>
          <span className="text-base font-medium">Projects</span>
        </div>
      </div>

      <div 
        ref={containerRef}
        className="relative border rounded-lg bg-gray-50 overflow-hidden cursor-grab active:cursor-grabbing"
        style={{ height: '80vh' }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg
          ref={svgRef}
          viewBox={viewBox}
          className="w-full"
          style={{ 
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out'
          , height: '100%'
          }}
        >
        {/* Arrow marker definition */}
        <defs>
          <marker
            id="arrowhead"
            markerWidth="12"
            markerHeight="12"
            refX="11"
            refY="4"
            orient="auto"
          >
            <polygon points="0 0, 12 4, 0 8" fill="#334155" />
          </marker>
        </defs>

        {/* Draw connections */}
        <g>
          {data.connections.map(conn => drawConnection(conn.from, conn.to))}
        </g>

        {/* Draw track nodes */}
        {data.tracks.map((track, trackIndex) => (
          <g key={track.id}>
            {/* Track label */}
            <text
              x={START_X - 85}
              y={START_Y + trackIndex * TRACK_SPACING + BASE_NODE_HEIGHT / 2}
              className={`font-bold ${getTextClass('lg')}`}
              textAnchor="start"
              dominantBaseline="middle"
              fill="#1f2937"
            >
              {track.name}
            </text>

            {/* Track nodes */}
            {track.nodes.map((node) => {
              const pos = positions.get(node.id);
              if (!pos) return null;
              
              const nodeWidth = nodeWidths.get(node.id) || MIN_NODE_WIDTH;

              return (
                <g
                  key={node.id}
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Shadow for depth */}
                  <rect
                    x={pos.x + 2}
                    y={pos.y + 2}
                    width={nodeWidth}
                    height={BASE_NODE_HEIGHT}
                    rx="8"
                    fill="#000000"
                    opacity="0.15"
                  />
                  {/* Main node */}
                  <rect
                    x={pos.x}
                    y={pos.y}
                    width={nodeWidth}
                    height={BASE_NODE_HEIGHT}
                    rx="8"
                    fill={getNodeColor(node, track)}
                    stroke={hoveredNode === node.id ? '#1e293b' : '#ffffff'}
                    strokeWidth={hoveredNode === node.id ? '3' : '1'}
                  />
                  {/* Text with better contrast */}
                  <text
                    x={pos.x + nodeWidth / 2}
                    y={pos.y + BASE_NODE_HEIGHT / 2}
                    className={`${getTextClass('lg')} font-bold fill-white`}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{ 
                      paintOrder: 'stroke',
                      stroke: '#000000',
                      strokeWidth: `${Math.round(5 * textMultiplier)}px`,
                      strokeLinejoin: 'round'
                    }}
                  >
                    {node.label}
                  </text>
                  {hoveredNode === node.id && node.description && (
                    <foreignObject
                      x={pos.x - 20}
                      y={pos.y - Math.round(120 * textMultiplier)}
                      width={Math.round(420 * textMultiplier)}
                      height={Math.round(120 * textMultiplier)}
                    >
                      <div className={`bg-gray-900 text-white ${getTextClass('base')} p-5 rounded-lg shadow-xl border border-gray-700 leading-relaxed`}>
                        {node.description}
                      </div>
                    </foreignObject>
                  )}
                </g>
              );
            })}
          </g>
        ))}

        {/* Draw checkpoints */}
        {data.checkpoints?.map((checkpoint) => {
          const pos = positions.get(checkpoint.id);
          if (!pos) return null;
          
          const checkpointWidth = nodeWidths.get(checkpoint.id) || (MIN_NODE_WIDTH + 40);

          return (
            <g
              key={checkpoint.id}
              onMouseEnter={() => setHoveredNode(checkpoint.id)}
              onMouseLeave={() => setHoveredNode(null)}
            >
              {/* Shadow */}
              <rect
                x={pos.x + 2}
                y={pos.y + 2}
                width={checkpointWidth}
                height={BASE_NODE_HEIGHT}
                rx="8"
                fill="#000000"
                opacity="0.2"
              />
              {/* Main checkpoint */}
              <rect
                x={pos.x}
                y={pos.y}
                width={checkpointWidth}
                height={BASE_NODE_HEIGHT}
                rx="8"
                fill="#4b5563"
                stroke={hoveredNode === checkpoint.id ? '#1e293b' : '#ffffff'}
                strokeWidth={hoveredNode === checkpoint.id ? '3' : '1'}
              />
              {/* Text with stroke outline */}
              <text
                x={pos.x + checkpointWidth / 2}
                y={pos.y + BASE_NODE_HEIGHT / 2}
                className={`${getTextClass('lg')} font-bold fill-white`}
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ 
                  paintOrder: 'stroke',
                  stroke: '#000000',
                  strokeWidth: `${Math.round(5 * textMultiplier)}px`,
                  strokeLinejoin: 'round'
                }}
              >
                {checkpoint.label}
              </text>
              {hoveredNode === checkpoint.id && checkpoint.description && (
                <foreignObject
                  x={pos.x - 20}
                  y={pos.y + BASE_NODE_HEIGHT + 15}
                  width={Math.round(420 * textMultiplier)}
                  height={Math.round(120 * textMultiplier)}
                >
                  <div className={`bg-gray-900 text-white ${getTextClass('base')} p-5 rounded-lg shadow-xl border border-gray-700 leading-relaxed`}>
                    {checkpoint.description}
                  </div>
                </foreignObject>
              )}
            </g>
          );
        })}

        {/* Draw projects */}
        {data.projects?.map((project) => {
          const pos = positions.get(project.id);
          if (!pos) return null;
          
          const projectWidth = nodeWidths.get(project.id) || MIN_NODE_WIDTH;

          return (
            <g
              key={project.id}
              onMouseEnter={() => setHoveredNode(project.id)}
              onMouseLeave={() => setHoveredNode(null)}
            >
              {/* Shadow */}
              <rect
                x={pos.x + 2}
                y={pos.y + 2}
                width={projectWidth}
                height={BASE_NODE_HEIGHT}
                rx="8"
                fill="#000000"
                opacity="0.3"
              />
              {/* Main project node */}
              <rect
                x={pos.x}
                y={pos.y}
                width={projectWidth}
                height={BASE_NODE_HEIGHT}
                rx="8"
                fill="#1f2937"
                stroke={hoveredNode === project.id ? '#3b82f6' : '#ffffff'}
                strokeWidth={hoveredNode === project.id ? '3' : '2'}
              />
              {/* Text with stroke outline */}
              <text
                x={pos.x + projectWidth / 2}
                y={pos.y + BASE_NODE_HEIGHT / 2}
                className={`${getTextClass('lg')} font-bold fill-white`}
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ 
                  paintOrder: 'stroke',
                  stroke: '#000000',
                  strokeWidth: `${Math.round(5 * textMultiplier)}px`,
                  strokeLinejoin: 'round'
                }}
              >
                {project.label}
              </text>
              {hoveredNode === project.id && project.description && (
                <foreignObject
                  x={pos.x - 20}
                  y={pos.y + BASE_NODE_HEIGHT + 15}
                  width={Math.round(360 * textMultiplier)}
                  height={Math.round(100 * textMultiplier)}
                >
                  <div className={`bg-gray-900 text-white ${getTextClass('base')} p-5 rounded-lg shadow-xl border border-gray-700 leading-relaxed`}>
                    {project.description}
                  </div>
                </foreignObject>
              )}
            </g>
          );
        })}
        </svg>
      </div>

      {/* Node details panel at bottom */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.tracks.flatMap(track => 
          track.nodes.map(node => (
            <Card key={node.id} className="p-4">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-semibold">{node.label}</h4>
                {getStatusBadge(node.status)}
              </div>
              <p className="text-base text-gray-600">{node.description}</p>
              <div className="mt-2 text-sm text-gray-500">Track: {track.name}</div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default RoadmapFlowchart;
