import React, { useState } from 'react';
import { PackingBox, PackedProp } from '../../types/packing.ts';
import { Trash2, Pencil, Box, AlertTriangle, CheckCircle, PackageCheck, PackageX, LucideIcon, QrCode, Printer, Palette } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { useRouter, Link } from 'expo-router';
import { TouchableOpacity, Text } from 'react-native'; // This import is actually not used in the current web version's JSX, but kept for reference if any RN components were snuck in

interface PackingBoxCardProps {
  box: PackingBox & { showId?: string };
  onEdit: (box: PackingBox) => void;
  onDelete: (boxId: string) => Promise<void>;
}

type StatusStyle = { bg: string; text: string; icon: LucideIcon };
const statusStyles: Record<string, StatusStyle> = {
  draft: { bg: 'bg-gray-700/30', text: 'text-gray-400', icon: Pencil },
  packed: { bg: 'bg-blue-700/30', text: 'text-blue-300', icon: PackageCheck },
  shipped: { bg: 'bg-purple-700/30', text: 'text-purple-300', icon: Box }, 
  delivered: { bg: 'bg-green-700/30', text: 'text-green-300', icon: CheckCircle },
  cancelled: { bg: 'bg-red-700/30', text: 'text-red-300', icon: PackageX },
};

export function PackingBoxCard({ box, onEdit, onDelete }: PackingBoxCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
        await onDelete(box.id);
    } catch (error) {
        console.error("Error during delete operation:", error);
    } finally {
        setIsDeleting(false);
    }    
  };

  const updatedAt = box.updatedAt;
  let timeAgo = 'Just now';
  if (updatedAt && updatedAt instanceof Timestamp) {
    try {
      timeAgo = formatDistanceToNow(updatedAt.toDate(), { addSuffix: true });
    } catch (e) {
      console.error("Error formatting date:", e);
      timeAgo = "Invalid date";
    }
  } else if (updatedAt && updatedAt instanceof Date) {
      try {
        timeAgo = formatDistanceToNow(updatedAt, { addSuffix: true });
      } catch (e) {
        console.error("Error formatting date:", e);
        timeAgo = "Invalid date";
      }
  } else if (typeof updatedAt === 'string') {
      try {
          const date = new Date(updatedAt);
          if (!isNaN(date.getTime())) {
              timeAgo = formatDistanceToNow(date, { addSuffix: true });
          } else {
              timeAgo = "Invalid date string";
          }
      } catch(e) {
          console.error("Error parsing date string:", e);
          timeAgo = "Invalid date format";
      }
  }
  
  const totalWeightKg = box.props?.reduce((sum: number, p: PackedProp) => sum + (p.weight || 0), 0) ?? 0;
  const hasFragileItem = box.props?.some(p => p.isFragile);
  const status = box.status ?? 'draft';
  const currentStatusStyle = statusStyles[status] || { bg: 'bg-yellow-700/30', text: 'text-yellow-300', icon: AlertTriangle };
  const StatusIcon = currentStatusStyle.icon;
  const statusBg = currentStatusStyle.bg;
  const statusText = currentStatusStyle.text;

  const handleNavigateToLabel = () => {
    router.push({
      pathname: '/(web)/packing/label/[id]' as any,
      params: { id: box.id, showId: box.showId }
    });
  };

  return (
    <div className={`bg-[#1F2937] w-fit rounded-lg shadow-md border border-gray-700 overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-gray-600`}>
      <div className="p-5">
        <div className="flex justify-between items-start mb-3">
          <Link 
            href={{
              pathname: '/(web)/packing/box/[id]' as any, 
              params: { id: box.id, showId: box.showId }
            }} 
            className="block hover:text-blue-400 transition-colors mr-4"
          >
            <h3 className="text-lg font-semibold text-gray-100 truncate" title={box.name ?? 'Unnamed Box'}>
              {box.name ?? 'Unnamed Box'}
            </h3>
          </Link>
          <div className="flex space-x-2 flex-shrink-0">
            <button
              onClick={() => onEdit(box)}
              className="p-1.5 rounded-md text-gray-400 hover:text-blue-400 hover:bg-blue-900/30 transition-colors duration-150"
              aria-label="Edit Box"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="p-1.5 rounded-md text-gray-400 hover:text-red-400 hover:bg-red-900/30 transition-colors duration-150 disabled:opacity-50"
              aria-label="Delete Box"
            >
              {isDeleting ? (
                <div className="h-4 w-4 border-2 border-transparent border-t-red-400 border-r-red-400 rounded-full animate-spin"></div>
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <div className="flex justify-between items-center mb-3 text-xs">
          <div className="flex items-center gap-2">
            <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-medium ${statusBg} ${statusText}`}>
              <StatusIcon className="h-3 w-3 mr-1.5" />
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </div>
            {/*TouchableOpacity with Text was here, it seems it was a leftover from a native attempt in the web file, replaced with a standard button for web consistency */}
            <button
              onClick={handleNavigateToLabel}
              className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium py-0.5 px-1.5 rounded transition-colors"
            >
              Label
            </button>
          </div>
          <span className="text-gray-500">Last updated: {timeAgo}</span>
        </div>

        {box.description && (
          <p className="text-sm text-gray-400 mb-3 line-clamp-2" title={box.description}>
            {box.description}
          </p>
        )}

        <div className="border-t border-gray-700 pt-4">
          <h4 className="text-sm font-medium text-gray-300 mb-2">Contents ({box.props?.length || 0} items)</h4>
          <div className="max-h-40 overflow-y-auto pr-2 space-y-1.5 custom-scrollbar">
            {box.props && box.props.length > 0 ? (
              box.props.map((prop: PackedProp, index: number) => (
                <div key={`${prop.propId}-${index}`} className="flex justify-between items-center text-xs text-gray-400">
                  <span className="truncate pr-2" title={prop.name}>{prop.name}</span>
                  <span className="flex-shrink-0">
                    Qty: {prop.quantity || 1} 
                    {prop.weight ? ` | ${prop.weight.toFixed(1)}${prop.weightUnit || 'kg'}` : ''}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-500 italic">No props added yet.</p>
            )}
          </div>
        </div>

        <div className="border-t border-gray-700 mt-4 pt-3 flex flex-wrap justify-between items-center gap-2 text-xs text-gray-500">
          <div className="flex items-center gap-3">
            <span>
              Total Weight: {totalWeightKg.toFixed(1)} kg
              {box.isHeavy && (
                <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-yellow-700/30 text-yellow-300" title="May require team lift">
                  <AlertTriangle className="h-2.5 w-2.5 mr-1" /> Heavy
                </span>
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
} 