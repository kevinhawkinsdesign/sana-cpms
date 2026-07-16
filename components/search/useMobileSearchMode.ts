import { useState } from 'react';
import { SearchResult } from '@/lib/search/searchTypes';

type MobileSearchMode = 'idle' | 'searching' | 'preview' | 'detail';

export function useMobileSearchMode() {
  const [mode, setMode] = useState<MobileSearchMode>('idle');
  const [previewCharger, setPreviewCharger] = useState<SearchResult | null>(null);
  const [openedFromSearch, setOpenedFromSearch] = useState(false);

  const showPreview = (result: SearchResult, fromSearch: boolean = false) => {
    setPreviewCharger(result);
    setMode('preview');
    setOpenedFromSearch(fromSearch);
  };

  const showDetail = () => {
    setMode('detail');
  };

  const backToSearch = () => {
    setMode('searching');
    setPreviewCharger(null);
    setOpenedFromSearch(false);
  };

  const collapse = () => {
    setMode('idle');
    setPreviewCharger(null);
    setOpenedFromSearch(false);
  };

  const startSearching = () => {
    setMode('searching');
  };

  return {
    mode,
    previewCharger,
    openedFromSearch,
    showPreview,
    showDetail,
    backToSearch,
    collapse,
    startSearching,
    setMode
  };
}
