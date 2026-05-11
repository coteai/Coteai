import React from 'react';
import { motion } from 'framer-motion';

interface AnimatedSectionProps {
    children: React.ReactNode;
    animation?: 'fade-in-up' | 'fade-in-left' | 'fade-in-right' | 'scale-in' | 'bounce-in' | 'fade-scale';
    delay?: string;
    className?: string;
}

const animations = {
    'fade-in-up': {
        initial: { opacity: 0, y: 30 },
        whileInView: { opacity: 1, y: 0 },
        transition: { duration: 0.6, ease: "easeOut" }
    },
    'fade-in-left': {
        initial: { opacity: 0, x: -30 },
        whileInView: { opacity: 1, x: 0 },
        transition: { duration: 0.6, ease: "easeOut" }
    },
    'fade-in-right': {
        initial: { opacity: 0, x: 30 },
        whileInView: { opacity: 1, x: 0 },
        transition: { duration: 0.6, ease: "easeOut" }
    },
    'scale-in': {
        initial: { opacity: 0, scale: 0.9 },
        whileInView: { opacity: 1, scale: 1 },
        transition: { duration: 0.5, ease: "easeOut" }
    },
    'bounce-in': {
        initial: { opacity: 0, scale: 0.5 },
        whileInView: { opacity: 1, scale: 1 },
        transition: { type: "spring", stiffness: 260, damping: 20 }
    },
    'fade-scale': {
        initial: { opacity: 0, scale: 0.95 },
        whileInView: { opacity: 1, scale: 1 },
        transition: { duration: 0.8, ease: "circOut" }
    }
} as const;

const delays: Record<string, number> = {
    'stagger-1': 0.1,
    'stagger-2': 0.2,
    'stagger-3': 0.3,
    'stagger-4': 0.4,
    'stagger-5': 0.5,
    'stagger-6': 0.6,
    'stagger-7': 0.7,
    'stagger-8': 0.8,
};

const AnimatedSection: React.FC<AnimatedSectionProps> = ({
    children,
    animation = 'fade-in-up',
    delay = '',
    className = ''
}) => {
    const anim = animations[animation];
    const delayValue = delays[delay] || 0;

    return (
        <motion.div
            initial={anim.initial}
            whileInView={anim.whileInView}
            viewport={{ once: true, margin: "-100px" }}
            // Use any here to bypass the strict ease check since as const made it literal strings that motion transition might not like mixed
            transition={{ ...anim.transition, delay: delayValue } as any}
            className={className}
        >
            {children}
        </motion.div>
    );
};

export default AnimatedSection;

