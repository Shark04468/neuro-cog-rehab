import { useEffect, useMemo, useState } from "react";

import {
  buildMusicLibraryViewModel,
  createEmptyMusicSelectionState,
  formatMusicDuration,
  MUSIC_TAG_LABELS,
  normalizeMusicSelectionState,
  recommendMusicForUser,
  toggleMusicDisabledForUser
} from "./music-library-model.js";
import type {
  MusicLibraryPageProps,
  MusicLibrarySelectionState,
  MusicTag,
  MusicTrack
} from "./music-library-types.js";

const tagOptions: Array<MusicTag | "all"> = [
  "all",
  "focus",
  "relax",
  "rhythm",
  "nature",
  "white_noise",
  "custom"
];

export function MusicLibraryPage(props: MusicLibraryPageProps) {
  const [selectedUserId, setSelectedUserId] = useState(
    props.initialUserId ?? props.users[0]?.id ?? "unassigned"
  );
  const [selectedTag, setSelectedTag] = useState<MusicTag | "all">(
    props.initialSelectedTag ?? "all"
  );
  const [selectionState, setSelectionState] = useState<MusicLibrarySelectionState>(
    props.initialSelectionState
      ? normalizeMusicSelectionState(props.initialSelectionState)
      : createEmptyMusicSelectionState()
  );

  useEffect(() => {
    if (props.initialSelectionState === undefined) {
      return;
    }
    setSelectionState(normalizeMusicSelectionState(props.initialSelectionState));
  }, [props.initialSelectionState]);

  const viewModel = useMemo(
    () =>
      buildMusicLibraryViewModel({
        tracks: props.tracks,
        users: props.users,
        selectedUserId,
        selectedTag,
        selectionState
      }),
    [props.tracks, props.users, selectedUserId, selectedTag, selectionState]
  );

  const updateSelectionState = (nextState: MusicLibrarySelectionState) => {
    setSelectionState(nextState);
    props.onSelectionChange?.(nextState);
  };

  return (
    <section className="ncr-music-library">
      <MusicLibraryStyles />
      <header className="ncr-music-library__header">
        <div>
          <p className="ncr-music-library__eyebrow">音乐疗愈素材库</p>
          <h1>选择适合本次辅助训练的音乐</h1>
          <p>根据训练目标、声音耐受和场景选择素材。推荐和禁用仅用于训练安排参考。</p>
        </div>
        <div className="ncr-music-library__counts" aria-label="当前用户音乐选择概览">
          <strong>{viewModel.recommendedCount}</strong>
          <span>已推荐</span>
          <strong>{viewModel.disabledCount}</strong>
          <span>已禁用</span>
        </div>
      </header>

      <div className="ncr-music-library__toolbar">
        <label className="ncr-music-library__field">
          <span>训练用户</span>
          <select
            value={viewModel.activeUser.id}
            onChange={(event) => {
              setSelectedUserId(event.target.value);
            }}
          >
            {props.users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.displayName} / {user.ageRange}
              </option>
            ))}
          </select>
        </label>

        <div className="ncr-music-library__user-note">
          <strong>{viewModel.activeUser.trainingGoal}</strong>
          {viewModel.activeUser.soundSensitivityNote ? (
            <span>{viewModel.activeUser.soundSensitivityNote}</span>
          ) : null}
        </div>
      </div>

      <div className="ncr-music-library__filters" role="group" aria-label="按音乐标签筛选">
        {tagOptions.map((tag) => (
          <button
            key={tag}
            type="button"
            className={tag === selectedTag ? "is-active" : ""}
            onClick={() => {
              setSelectedTag(tag);
            }}
          >
            {MUSIC_TAG_LABELS[tag]}
          </button>
        ))}
      </div>

      <div className="ncr-music-library__grid">
        {viewModel.tracks.map((track) => (
          <MusicTrackCard
            key={track.id}
            track={track}
            onRecommend={() => {
              updateSelectionState(
                recommendMusicForUser(selectionState, viewModel.activeUser.id, track.id)
              );
            }}
            onToggleDisabled={() => {
              updateSelectionState(
                toggleMusicDisabledForUser(selectionState, viewModel.activeUser.id, track.id)
              );
            }}
          />
        ))}
      </div>
    </section>
  );
}

function MusicTrackCard(props: {
  track: MusicTrack & { isRecommended: boolean; isDisabled: boolean };
  onRecommend: () => void;
  onToggleDisabled: () => void;
}) {
  const bpmLabel = props.track.bpm === null ? "无固定节拍" : `${props.track.bpm} BPM`;

  return (
    <article className={props.track.isDisabled ? "ncr-music-card is-disabled" : "ncr-music-card"}>
      <div className="ncr-music-card__topline">
        <span>强度 {props.track.intensityLevel}/5</span>
        {props.track.isRecommended ? <strong>已推荐</strong> : null}
        {props.track.isDisabled ? <strong>已禁用</strong> : null}
      </div>
      <h3>{props.track.title}</h3>
      <div className="ncr-music-card__meta">
        <span>{formatMusicDuration(props.track.duration)}</span>
        <span>{bpmLabel}</span>
      </div>
      <div className="ncr-music-card__tags">
        {props.track.tags.map((tag: MusicTag) => (
          <span key={tag}>{MUSIC_TAG_LABELS[tag]}</span>
        ))}
      </div>
      <p className="ncr-music-card__scene">{props.track.recommendedScene}</p>
      <p className="ncr-music-card__note">使用提醒：{props.track.contraindicationNote}</p>
      <div className="ncr-music-card__actions">
        <button type="button" onClick={props.onRecommend} disabled={props.track.isDisabled}>
          {props.track.isRecommended ? "保持推荐" : "推荐给用户"}
        </button>
        <button type="button" className="is-secondary" onClick={props.onToggleDisabled}>
          {props.track.isDisabled ? "解除禁用" : "禁用此音乐"}
        </button>
      </div>
    </article>
  );
}

function MusicLibraryStyles() {
  return <style>{musicLibraryCss}</style>;
}

const musicLibraryCss = `
.ncr-music-library {
  box-sizing: border-box;
  width: 100%;
  color: #20322c;
  font-family:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.ncr-music-library__header {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: flex-start;
  margin-bottom: 18px;
}

.ncr-music-library__eyebrow {
  margin: 0 0 6px;
  color: #63766f;
  font-size: 13px;
  font-weight: 700;
}

.ncr-music-library__header h1,
.ncr-music-library__header h2 {
  margin: 0;
  font-size: 28px;
  line-height: 1.2;
  letter-spacing: 0;
}

.ncr-music-library__header p {
  margin: 8px 0 0;
  max-width: 640px;
  color: #536a62;
  font-size: 14px;
  line-height: 1.5;
}

.ncr-music-library__counts {
  display: grid;
  grid-template-columns: auto auto;
  gap: 4px 8px;
  min-width: 140px;
  border: 1px solid #d9e5df;
  border-radius: 8px;
  background: #ffffff;
  padding: 12px;
}

.ncr-music-library__counts strong {
  color: #26584c;
  font-size: 18px;
}

.ncr-music-library__counts span {
  color: #5e736b;
  font-size: 13px;
  font-weight: 700;
}

.ncr-music-library__toolbar {
  display: grid;
  grid-template-columns: minmax(220px, 320px) 1fr;
  gap: 12px;
  margin-bottom: 14px;
}

.ncr-music-library__field,
.ncr-music-library__user-note {
  min-width: 0;
  border: 1px solid #d9e5df;
  border-radius: 8px;
  background: #ffffff;
  padding: 12px;
}

.ncr-music-library__field span,
.ncr-music-library__user-note span {
  display: block;
  color: #667a73;
  font-size: 12px;
  font-weight: 700;
}

.ncr-music-library__field select {
  width: 100%;
  margin-top: 6px;
  border: 1px solid #c8d8d1;
  border-radius: 8px;
  background: #f9fcfa;
  color: #20322c;
  padding: 9px 10px;
  font: inherit;
}

.ncr-music-library__user-note strong {
  display: block;
  margin-bottom: 5px;
  color: #263b34;
  font-size: 15px;
}

.ncr-music-library__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.ncr-music-library button {
  min-height: 38px;
  border: 1px solid #c8d8d1;
  border-radius: 8px;
  background: #ffffff;
  color: #28483f;
  padding: 0 13px;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.ncr-music-library button.is-active,
.ncr-music-card__actions button:not(.is-secondary) {
  border-color: #5f9f87;
  background: #dff0e8;
}

.ncr-music-library button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.ncr-music-library button:focus-visible {
  outline: 3px solid #9ccbbb;
  outline-offset: 2px;
}

.ncr-music-library__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.ncr-music-card {
  min-width: 0;
  border: 1px solid #d9e5df;
  border-radius: 8px;
  background: #ffffff;
  padding: 16px;
  box-shadow: 0 8px 20px rgba(39, 66, 57, 0.06);
}

.ncr-music-card.is-disabled {
  background: #f7f7f5;
  color: #68746f;
}

.ncr-music-card__topline {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  color: #657a72;
  font-size: 12px;
  font-weight: 700;
}

.ncr-music-card__topline strong {
  border-radius: 999px;
  background: #edf6f1;
  color: #26584c;
  padding: 3px 8px;
}

.ncr-music-card h3 {
  margin: 10px 0 8px;
  color: #20322c;
  font-size: 20px;
  line-height: 1.2;
  letter-spacing: 0;
}

.ncr-music-card__meta,
.ncr-music-card__tags,
.ncr-music-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.ncr-music-card__meta span,
.ncr-music-card__tags span {
  border-radius: 999px;
  background: #eef5f1;
  color: #36564d;
  padding: 4px 9px;
  font-size: 12px;
  font-weight: 700;
}

.ncr-music-card__scene {
  margin: 12px 0 8px;
  color: #314b43;
  font-size: 14px;
  line-height: 1.45;
}

.ncr-music-card__note {
  margin: 0 0 14px;
  border-left: 4px solid #d8c37a;
  border-radius: 8px;
  background: #fff9e7;
  color: #5a4a1e;
  padding: 10px 12px;
  font-size: 13px;
  line-height: 1.45;
}

.ncr-music-card__actions .is-secondary {
  background: #ffffff;
}

@media (max-width: 780px) {
  .ncr-music-library__header,
  .ncr-music-library__toolbar,
  .ncr-music-library__grid {
    grid-template-columns: 1fr;
  }

  .ncr-music-library__header {
    display: grid;
  }
}
`;
