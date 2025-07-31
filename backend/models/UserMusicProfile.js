// backend/models/UserMusicProfile.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ArtistStatSchema = new Schema({
    name: { type: String, required: true },
    score: { type: Number, default: 0 },
}, { _id: false });

// --- НАЧАЛО ИЗМЕНЕНИЯ 1: Добавляем схему для жанров ---
const GenreStatSchema = new Schema({
    name: { type: String, required: true },
    score: { type: Number, default: 0 },
}, { _id: false });
// --- КОНЕЦ ИЗМЕНЕНИЯ 1 ---

const UserMusicProfileSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    topArtists: [ArtistStatSchema],
    // --- НАЧАЛО ИЗМЕНЕНИЯ 2: Добавляем новое поле в модель ---
    topGenres: [GenreStatSchema],
    // --- КОНЕЦ ИЗМЕНЕНИЯ 2 ---
}, { timestamps: true });

UserMusicProfileSchema.methods.updateArtistScore = function(artistName, points) {
    const artist = this.topArtists.find(a => a.name === artistName);
    if (artist) {
        artist.score += points;
    } else {
        this.topArtists.push({ name: artistName, score: points });
    }
    this.topArtists.sort((a, b) => b.score - a.score);
    if (this.topArtists.length > 50) {
        this.topArtists = this.topArtists.slice(0, 50);
    }
};

// --- НАЧАЛО ИЗМЕНЕНИЯ 3: Добавляем метод для обновления жанров ---
UserMusicProfileSchema.methods.updateGenreScore = function(genreName, points) {
    const genre = this.topGenres.find(g => g.name === genreName);
    if (genre) {
        genre.score += points;
    } else {
        this.topGenres.push({ name: genreName, score: points });
    }
    this.topGenres.sort((a, b) => b.score - a.score);
    if (this.topGenres.length > 20) {
        this.topGenres = this.topGenres.slice(0, 20);
    }
};
// --- КОНЕЦ ИЗМЕНЕНИЯ 3 ---


module.exports = mongoose.model('UserMusicProfile', UserMusicProfileSchema);