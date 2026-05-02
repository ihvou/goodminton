import { ImageResponse } from 'next/og';
import type { CSSProperties } from 'react';

export const shareImageAlt =
  'Goodminton badminton scores and ratings preview';
export const shareImageSize = {
  width: 1200,
  height: 630,
};
export const shareImageContentType = 'image/png';

export function createShareImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: '#f7f7f5',
          color: '#0a0a0a',
          padding: 64,
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            border: '2px solid #0a0a0a',
            borderRadius: 36,
            background: '#ffffff',
            padding: 56,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 22,
            }}
          >
            <div
              style={{
                width: 72,
                height: 72,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 18,
                background: '#0a0a0a',
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 44,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 999,
                    background: '#ffffff',
                  }}
                />
                <div
                  style={{
                    width: 4,
                    height: 28,
                    marginTop: 4,
                    background: '#ffffff',
                    borderRadius: 999,
                  }}
                />
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              <div style={{ fontSize: 34, fontWeight: 700 }}>Goodminton</div>
              <div style={{ fontSize: 20, color: '#525252' }}>
                Club badminton scores
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 22,
              maxWidth: 880,
            }}
          >
            <div
              style={{
                fontSize: 76,
                lineHeight: 0.95,
                fontWeight: 800,
                letterSpacing: 0,
              }}
            >
              Scores, ratings, and match history.
            </div>
            <div
              style={{
                fontSize: 28,
                lineHeight: 1.35,
                color: '#404040',
              }}
            >
              Public standings for players and teams from the club court.
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 14,
              fontSize: 22,
              color: '#262626',
            }}
          >
            <div style={pillStyle}>Players</div>
            <div style={pillStyle}>Teams</div>
            <div style={pillStyle}>Win rate</div>
            <div style={pillStyle}>Points</div>
          </div>
        </div>
      </div>
    ),
    shareImageSize,
  );
}

const pillStyle: CSSProperties = {
  display: 'flex',
  border: '1px solid #d4d4d4',
  borderRadius: 999,
  padding: '10px 18px',
  background: '#fafafa',
};
