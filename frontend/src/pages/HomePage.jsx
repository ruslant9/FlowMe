// frontend/src/pages/HomePage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import useTitle from '../hooks/useTitle';
import axios from 'axios';
import PostCard from '../components/PostCard';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import EditPostModal from '../components/modals/EditPostModal';
import PageWrapper from '../components/PageWrapper';

const API_URL = import.meta.env.VITE_API_URL;

const HomePage = () => {
    useTitle('Лента');
    const [posts, setPosts] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [myMusicTrackIds, setMyMusicTrackIds] = useState(new Set());
    const [editingPost, setEditingPost] = useState(null);

    useEffect(() => {
        const fetchCurrentUser = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                const res = await axios.get(`${API_URL}/api/user/profile`, { headers: { Authorization: `Bearer ${token}` } });
                setCurrentUser(res.data);
            }
        };
        const fetchMyMusic = async () => {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/api/music/saved`, { headers: { Authorization: `Bearer ${token}` } });
            setMyMusicTrackIds(new Set(res.data.map(track => track.youtubeId)));
        };
        fetchMyMusic().catch(console.error);
        fetchCurrentUser().catch(console.error);
    }, []);

    const fetchFeed = useCallback(async (showLoader = true) => {
        if (showLoader) {
            setLoading(true);
        }
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/api/posts/feed`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPosts(res.data);
        } catch (error) {
            toast.error('Не удалось загрузить ленту');
        } finally {
            if (showLoader) {
                setLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        fetchFeed(true);

        const handlePostUpdate = (event) => {
            const updatedPostId = event.detail.postId;
            const fullPost = event.detail.fullPost;

            if (!fullPost) return; // Не обновляем, если нет полных данных

            setPosts(prevPosts => {
                const postExists = prevPosts.some(p => p._id === updatedPostId);
                let newPosts;

                if (postExists) {
                    // Заменяем существующий пост новыми данными
                    newPosts = prevPosts.map(p => p._id === updatedPostId ? fullPost : p);
                } else {
                    // Если поста нет (например, новый пост в ленте), добавляем его
                    newPosts = [fullPost, ...prevPosts];
                }

                // Всегда пересортировываем, чтобы учесть закрепленные посты
                newPosts.sort((a, b) => {
                    if (a.isPinned && !b.isPinned) return -1;
                    if (!a.isPinned && b.isPinned) return 1;
                    return new Date(b.createdAt) - new Date(a.createdAt);
                });
                
                return newPosts;
            });
        };

        const handlePostDelete = (event) => {
            setPosts(prev => prev.filter(p => p._id !== event.detail.postId));
        };

        window.addEventListener('postUpdated', handlePostUpdate);
        window.addEventListener('postDeleted', handlePostDelete);
        
        return () => {
            window.removeEventListener('postUpdated', handlePostUpdate);
            window.removeEventListener('postDeleted', handlePostDelete);
        };
    }, [fetchFeed]);

    const handlePostUpdateInPlace = (postId, updatedData) => {
        setPosts(prevPosts => {
            const newPosts = prevPosts.map(p => (p._id === postId ? { ...p, ...updatedData } : p));
            if (updatedData.isPinned !== undefined) {
                 newPosts.sort((a, b) => {
                    if (a.isPinned && !b.isPinned) return -1;
                    if (!a.isPinned && b.isPinned) return 1;
                    return new Date(b.createdAt) - new Date(a.createdAt);
                });
            }
            return newPosts;
        });
    };

    const handlePostDeleteInPlace = (postId) => {
         setPosts(prevPosts => prevPosts.filter(p => p._id !== postId));
    };

    return (
        <PageWrapper>
            <main className="flex-1 p-4 md:p-8">
                <EditPostModal
                    isOpen={!!editingPost}
                    post={editingPost}
                    onClose={() => {
                        setEditingPost(null);
                        fetchFeed(false);
                    }}
                />
                <div className="max-w-2xl mx-auto space-y-6">
                    <h1 className="text-3xl font-bold text-center">Лента</h1>

                    {loading ? (
                        <div className="flex justify-center items-center py-20">
                            <Loader2 className="w-10 h-10 animate-spin text-slate-400" />
                        </div>
                    ) : posts.length > 0 ? (
                        posts.map(post => (
                            <PostCard 
                                key={post._id} 
                                post={post} 
                                onPostDelete={handlePostDeleteInPlace}
                                onPostUpdate={handlePostUpdateInPlace}
                                currentUser={currentUser}
                                myMusicTrackIds={myMusicTrackIds}
                                context="feed"
                                onEditRequest={setEditingPost}
                            />
                        ))
                    ) : (
                        <div className="ios-glass-final rounded-3xl p-10 text-center text-slate-500 dark:text-white/60">
                            <h2 className="text-xl font-semibold mb-2">Ваша лента пуста</h2>
                            <p>Подпишитесь на других пользователей, чтобы видеть их посты здесь.</p>
                        </div>
                    )}
                </div>
            </main>
        </PageWrapper>
    );
};

export default HomePage;