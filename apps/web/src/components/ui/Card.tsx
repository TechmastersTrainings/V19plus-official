'use client';

import React from 'react';

export interface CardProps {
  title?: string;
  paragraph?: string;
  items?: string[];
  buttonText?: string;
  theme?: 'cyan' | 'orange';
  onClick?: () => void;
  className?: string;
}

const DEFAULT_ITEMS = [
  'Set Clear Goals',
  'Stay Organized',
  'Continuous Learning',
  'Time Management',
  'Maintain a Positive Attitude',
];

export const Card: React.FC<CardProps> = ({
  title = 'Keys to Success',
  paragraph = 'Best way to be success in your life.',
  items = DEFAULT_ITEMS,
  buttonText = 'Get Your Success',
  theme = 'orange',
  onClick,
  className = '',
}) => {
  return (
    <div className={`card ${theme === 'cyan' ? 'theme-cyan' : ''} ${className}`}>
      <div className="card__border" />
      <div className="card_title__container">
        <span className="card_title">{title}</span>
        <p className="card_paragraph">{paragraph}</p>
      </div>
      <hr className="line" />
      <ul className="card__list">
        {items.map((item, index) => (
          <li key={index} className="card__list_item">
            <span className="check">
              <svg
                className="check_svg"
                fill="currentColor"
                viewBox="0 0 16 16"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  clipRule="evenodd"
                  d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z"
                  fillRule="evenodd"
                />
              </svg>
            </span>
            <span className="list_text">{item}</span>
          </li>
        ))}
      </ul>
      <button className="button" onClick={onClick}>
        {buttonText}
      </button>
    </div>
  );
};

export default Card;
