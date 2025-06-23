// First create the auth utility
export const getToken = () => {
  // You can implement your token storage/retrieval logic here
  // For example, using AsyncStorage:
  try {
    // Return the stored token or null if not found
    return localStorage.getItem('authToken');
  } catch (error) {
    console.error('Error getting token:', error);
    return null;
  }
};