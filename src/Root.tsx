import React from 'react';
import {Composition} from 'remotion';
import {PPSReel, buildTimeline} from './PPSReel';
import {PPSLearn, learnTimeline, LearnContent} from './PPSLearn';
import pps from '../data/pps.json';
import ppsLearn from '../data/pps-learn.json';

export const RemotionRoot: React.FC = () => (
  <>
    {/* Version A: product ad */}
    <Composition
      id="pps"
      component={PPSReel}
      durationInFrames={buildTimeline(pps).total}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{content: pps}}
      calculateMetadata={({props}) => ({durationInFrames: buildTimeline(props.content).total})}
    />
    {/* Version B: how-to, no selling */}
    <Composition
      id="pps-learn"
      component={PPSLearn}
      durationInFrames={learnTimeline(ppsLearn as LearnContent).total}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{content: ppsLearn as LearnContent}}
      calculateMetadata={({props}) => ({durationInFrames: learnTimeline(props.content).total})}
    />
  </>
);
