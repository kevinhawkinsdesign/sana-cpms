import { useFormContext } from 'react-hook-form';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import ImageUpload from '@/components/ui/image-upload';
import { X, Car, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';

const VehicleColorManagement = () => {
    const { watch, setValue, getValues } = useFormContext();
    const colors = watch('colors') || [];
    const [newColor, setNewColor] = useState({ name: '', imageUrl: '' });

    useEffect(() => {
        
    }, [colors, getValues]);

    const addColor = () => {
        if (newColor.name.trim()) {
            const updatedColors = [...colors, { ...newColor }];
            setValue('colors', updatedColors);
            setNewColor({ name: '', imageUrl: '' });
        }
    };

    const removeColor = (index: number) => {
        const updatedColors = colors.filter((_: any, i: number) => i !== index);
        setValue('colors', updatedColors);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Vehicle Colors</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {/* Add New Color */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg">
                        <div>
                            <Label>Color Name</Label>
                            <input
                                placeholder="e.g., Tesla White"
                                value={newColor.name}
                                onChange={(e) => setNewColor(prev => ({ ...prev, name: e.target.value }))}
                                className="input"
                            />
                        </div>
                        <div>
                            <Label>Color Image</Label>
                            <ImageUpload
                                label="Color Image"
                                name="newColorImage"
                                currentImage={newColor.imageUrl}
                                onImageChange={(_, url) => setNewColor(prev => ({ ...prev, imageUrl: url }))}
                                isRequired={false}
                                uploadContext="product-additional"
                                entityId={undefined}
                            />
                        </div>
                        <div className="flex items-end">
                            <Button 
                                onClick={addColor}
                                disabled={!newColor.name.trim()}
                                className="w-full"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Color
                            </Button>
                        </div>
                    </div>

                    {/* Display Added Colors */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {colors.map((color: any, index: number) => (
                            <div key={index} className="relative group">
                                <div className="flex flex-col items-center p-4 rounded-lg border">
                                    {color.imageUrl ? (
                                        <div className="w-16 h-16 rounded-lg mb-2 overflow-hidden border">
                                            <img 
                                                src={color.imageUrl} 
                                                alt={color.name}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    ) : (
                                        <div className="w-16 h-16 rounded-lg mb-2 border-2 border-gray-300 bg-gray-100 flex items-center justify-center">
                                            <span className="text-xs text-gray-500">No Image</span>
                                        </div>
                                    )}
                                    <span className="text-sm font-medium text-center">{color.name}</span>
                                </div>
                                {/* Remove Button */}
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon"
                                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => removeColor(index)}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>

                    {colors.length === 0 && (
                        <div className="text-center text-muted-foreground py-8">
                            <Car className="h-8 w-8 mx-auto mb-2" />
                            <p>No colors added yet. Add colors specific to this vehicle.</p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

export default VehicleColorManagement; 