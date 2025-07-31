// frontend/src/components/LikesPopover.jsx
import React, { useState } from 'react'; // ИЗМЕНЕНИЕ: Добавлен useState
import Tippy from '@tippyjs/react/headless';
import LikesList from './LikesList';
import UserListModal from './modals/UserListModal'; // ИЗМЕНЕНИЕ: Импорт UserListModal

const MAX_LIKES_IN_POPOVER = 2; // ИЗМЕНЕНИЕ: Новая константа для количества лайков в поп-апе

const LikesPopover = ({ children, likers, postOwnerId }) => {
    const [isLikersModalOpen, setIsLikersModalOpen] = useState(false); // ИЗМЕНЕНИЕ: Состояние для модального окна лайкеров

    // Если нет лайков, просто рендерим дочерний элемент без подсказки
    if (!likers || likers.length === 0) {
        return <>{children}</>;
    }

    const showFullListButton = likers.length > MAX_LIKES_IN_POPOVER;
    const visibleLikers = likers.slice(0, MAX_LIKES_IN_POPOVER);

    const handleOpenLikersModal = (e) => {
        e.preventDefault(); // Предотвращаем дефолтное поведение (например, переход по ссылке)
        e.stopPropagation(); // Предотвращаем всплытие события клика
        setIsLikersModalOpen(true);
    };

    return (
        <>
            <Tippy
                interactive
                placement="top"
                delay={[300, 100]}
                render={attrs => (
                    // ИЗМЕНЕНИЕ: Условный рендеринг содержимого Tippy
                    showFullListButton ? (
                        <div className="ios-glass-popover p-2 rounded-xl shadow-lg" {...attrs}>
                            <p className="text-sm text-slate-800 dark:text-white">
                                {likers.length} {likers.length === 1 ? 'лайк' : likers.length > 1 && likers.length < 5 ? 'лайка' : 'лайков'}
                            </p>
                            <div className="tippy-arrow" data-popper-arrow></div>
                        </div>
                    ) : (
                        <LikesList likers={visibleLikers} attrs={attrs} postOwnerId={postOwnerId} />
                    )
                )}
            >
                {/* ИЗМЕНЕНИЕ: Обертываем children в span для управления кликом */}
                <span onClick={showFullListButton ? handleOpenLikersModal : undefined} className={showFullListButton ? 'cursor-pointer' : ''}>
                    {children}
                </span>
            </Tippy>

            {/* ИЗМЕНЕНИЕ: Модальное окно со списком лайкеров */}
            <UserListModal
                isOpen={isLikersModalOpen}
                onClose={() => setIsLikersModalOpen(false)}
                title="Понравилось"
                items={likers}
                listType="user"
                postOwnerId={postOwnerId}
            />
        </>
    );
};

export default LikesPopover;