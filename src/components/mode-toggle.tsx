'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type ModeToggleProps = {
    currentMode: 'create' | 'remix';
    onModeChange: (mode: 'create' | 'remix') => void;
};

export function ModeToggle({ currentMode, onModeChange }: ModeToggleProps) {
    return (
        <Tabs
            value={currentMode}
            onValueChange={(value) => onModeChange(value as 'create' | 'remix')}
            className='w-auto'>
            <TabsList className='grid h-auto grid-cols-2 gap-1 rounded-md border-none bg-transparent p-0'>
                <TabsTrigger
                    value='create'
                    className={`rounded-md border px-3 py-1 text-sm transition-colors ${
                        currentMode === 'create'
                            ? 'border-white bg-white text-black'
                            : 'border-dashed border-white/30 bg-transparent text-white/60 hover:border-white/50 hover:text-white/80'
                    } `}>
                    Create Video
                </TabsTrigger>
                <TabsTrigger
                    value='remix'
                    className={`rounded-md border px-3 py-1 text-sm transition-colors ${
                        currentMode === 'remix'
                            ? 'border-white bg-white text-black'
                            : 'border-dashed border-white/30 bg-transparent text-white/60 hover:border-white/50 hover:text-white/80'
                    } `}>
                    Remix Video
                </TabsTrigger>
            </TabsList>
        </Tabs>
    );
}
