import axios from 'axios';

export const createOrGetConversation = async (matchId: number): Promise<number | null> => {
  try {
    const token = localStorage.getItem('jwt');
    const response = await axios.post(
      'http://localhost:5000/api/chat/conversations',
      { match_id: matchId },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data.id;
  } catch (error) {
    console.error('Error creating conversation:', error);
    return null;
  }
};
