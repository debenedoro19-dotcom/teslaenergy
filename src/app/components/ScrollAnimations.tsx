'use client';
import { useEffect } from 'react';

export default function ScrollAnimations() {
  useEffect(() => {
    // Hero reveal on mount
    const heroReveal = document.querySelectorAll('.hero-reveal');
    heroReveal.forEach((el, i) => {
      const elem = el as HTMLElement;
      elem.style.opacity = '0';
      elem.style.transform = 'translateY(40px)';
      setTimeout(() => {
        elem.style.transition = 'opacity 1.2s cubic-bezier(0.19,1,0.22,1), transform 1.2s cubic-bezier(0.19,1,0.22,1)';
        elem.style.opacity = '1';
        elem.style.transform = 'translateY(0)';
      }, i * 200 + 100);
    });

    // Scroll reveals — CSS already sets opacity:0 / translateY(30px) as initial state
    const revealEls = document.querySelectorAll('.section-reveal');
    const elemsToObserve: HTMLElement[] = [];

    revealEls.forEach((el) => {
      const elem = el as HTMLElement;
      if (!elem.closest('header')) {
        elemsToObserve.push(elem);
      }
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const elem = entry.target as HTMLElement;
            const rawDelay = elem.style.transitionDelay;
            const delay = rawDelay ? parseFloat(rawDelay) : 0;
            elem.style.willChange = 'opacity, transform';
            setTimeout(() => {
              elem.style.transition = 'opacity 0.8s cubic-bezier(0.19,1,0.22,1), transform 0.8s cubic-bezier(0.19,1,0.22,1)';
              elem.style.opacity = '1';
              elem.style.transform = 'translateY(0)';
              setTimeout(() => { elem.style.willChange = 'auto'; }, 900);
            }, delay);
            observer.unobserve(elem);
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    );

    elemsToObserve.forEach((elem) => observer.observe(elem));

    return () => observer.disconnect();
  }, []);

  return null;
}