import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { listAllImages, getImage, deleteImage } from '../utils/imageStorage';

interface ImageItem {
  key: string;
  metadata: any;
}

const DebugScreen: React.FC = () => {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadImages = async () => {
    try {
      setLoading(true);
      const imagesList = await listAllImages();
      setImages(imagesList);
    } catch (error) {
      console.error('Failed to load images:', error);
      Alert.alert('Error', 'Failed to load images from storage');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadImages();
  }, []);

  const handleViewImage = async (key: string) => {
    try {
      const { imageData, metadata } = await getImage(key);
      Alert.alert(
        'Image Data',
        `Metadata: ${JSON.stringify(metadata, null, 2)}\n\nData: ${imageData.substring(0, 200)}...`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Failed to view image:', error);
      Alert.alert('Error', 'Failed to view image data');
    }
  };

  const handleDeleteImage = async (key: string) => {
    try {
      await deleteImage(key);
      Alert.alert('Success', 'Image deleted successfully');
      loadImages(); // Refresh the list
    } catch (error) {
      console.error('Failed to delete image:', error);
      Alert.alert('Error', 'Failed to delete image');
    }
  };

  const renderItem = ({ item }: { item: ImageItem }) => {
    const date = new Date(item.metadata?.timestamp || 0).toLocaleString();
    return (
      <View style={styles.item}>
        <View style={styles.itemContent}>
          <Text style={styles.title}>{item.metadata?.taskTitle || 'Unknown'}</Text>
          <Text style={styles.date}>{date}</Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity 
            style={[styles.button, styles.viewButton]} 
            onPress={() => handleViewImage(item.key)}
          >
            <Text style={styles.buttonText}>View</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.button, styles.deleteButton]} 
            onPress={() => handleDeleteImage(item.key)}
          >
            <Text style={styles.buttonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Stored Images ({images.length})</Text>
      {loading ? (
        <Text style={styles.loading}>Loading...</Text>
      ) : (
        <>
          <TouchableOpacity style={styles.refreshButton} onPress={loadImages}>
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
          {images.length === 0 ? (
            <Text style={styles.noImages}>No images stored</Text>
          ) : (
            <FlatList
              data={images}
              renderItem={renderItem}
              keyExtractor={(item) => item.key}
              contentContainerStyle={styles.list}
            />
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  list: {
    paddingBottom: 20,
  },
  item: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  itemContent: {
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  date: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginLeft: 8,
  },
  viewButton: {
    backgroundColor: '#4a90e2',
  },
  deleteButton: {
    backgroundColor: '#e25c4a',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  loading: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },
  noImages: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },
  refreshButton: {
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 4,
    alignItems: 'center',
    marginBottom: 16,
  },
  refreshButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default DebugScreen;