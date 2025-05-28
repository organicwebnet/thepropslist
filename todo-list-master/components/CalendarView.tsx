import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { Timestamp } from 'firebase/firestore';
import Colors from '../constants/Colors';

// Interface for Card Data (ensure fields match BoardScreen definition)
interface CardData {
    id: string;
    title: string;
    order: number;
    listId: string;
    boardId: string;
    description?: string;
    dueDate?: Timestamp;
    createdAt?: any;
}

// Define the expected color theme structure
type ColorTheme = typeof Colors.light;

// Define the structure for marked dates based on library usage
interface MarkingProps {
  marked?: boolean;
  dotColor?: string;
  dots?: {key: string, color: string}[]; // If using multi-dot
  selected?: boolean;
  selectedColor?: string;
  selectedTextColor?: string;
  disabled?: boolean;
  activeOpacity?: number;
  // Add other properties as needed from the library docs
}

type MarkedDatesType = {
  [key: string]: MarkingProps;
};

interface CalendarViewProps {
    cards: CardData[]; // All cards for the board
    colors: ColorTheme;
    onDayPress?: (day: DateData) => void; // Optional handler for day press
    onCardPress: (card: CardData) => void; // Handler for pressing a card in the list
}

// Helper to format Firestore Timestamp or JS Date to 'YYYY-MM-DD'
const formatDateToISO = (date: Timestamp | Date | undefined | null): string | null => {
    if (!date) return null;
    const jsDate = date instanceof Timestamp ? date.toDate() : date;
    return jsDate.toISOString().split('T')[0];
};

const CalendarView: React.FC<CalendarViewProps> = ({ 
    cards, 
    colors, 
    onDayPress, 
    onCardPress 
}) => {
    const [selectedDate, setSelectedDate] = useState<string | null>(formatDateToISO(new Date())); // Default to today

    // Memoize marked dates calculation
    const markedDates: MarkedDatesType = useMemo(() => {
        const marks: MarkedDatesType = {};
        cards.forEach(card => {
            const dateStr = formatDateToISO(card.dueDate);
            if (dateStr) {
                if (!marks[dateStr]) {
                    marks[dateStr] = { marked: true, dotColor: colors.primary, dots: [] };
                }
                // Optionally add more dots or info if needed
                // marks[dateStr].dots?.push({ key: card.id, color: colors.primary }); 
            }
        });

        // Add marking for the currently selected day
        if (selectedDate && marks[selectedDate]) {
            marks[selectedDate] = { ...marks[selectedDate], selected: true, selectedColor: colors.primaryLight, selectedTextColor: colors.text };
        } else if (selectedDate) {
            marks[selectedDate] = { selected: true, selectedColor: colors.primaryLight, selectedTextColor: colors.text };
        }
        
        return marks;
    }, [cards, selectedDate, colors]);

    // Filter cards for the selected date
    const cardsForSelectedDate = useMemo(() => {
        if (!selectedDate) return [];
        return cards
            .filter(card => formatDateToISO(card.dueDate) === selectedDate)
            .sort((a, b) => a.order - b.order); // Sort by order
    }, [cards, selectedDate]);

    const handleDayPress = (day: DateData) => {
        setSelectedDate(day.dateString);
        if (onDayPress) {
            onDayPress(day);
        }
    };

    const renderCardItem = ({ item }: { item: CardData }) => (
        <Pressable onPress={() => onCardPress(item)} style={[styles.cardItem, { backgroundColor: colors.backgroundSection }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{item.title}</Text>
            {/* Optionally show list name or other details */}
        </Pressable>
    );

    return (
        <View style={styles.container}>
            <Calendar
                current={selectedDate || undefined} // Set initial visible month if needed
                onDayPress={handleDayPress}
                markedDates={markedDates}
                markingType={'multi-dot'} // Use 'multi-dot' or just 'dot' if preferred
                monthFormat={'yyyy MMMM'}
                theme={{
                    backgroundColor: colors.background,
                    calendarBackground: colors.backgroundSection,
                    textSectionTitleColor: colors.textSecondary,
                    selectedDayBackgroundColor: colors.primary,
                    selectedDayTextColor: colors.textLight,
                    todayTextColor: colors.primary,
                    dayTextColor: colors.text,
                    textDisabledColor: colors.textSecondary + '80', // Lighter secondary
                    dotColor: colors.primary,
                    selectedDotColor: colors.textLight,
                    arrowColor: colors.primary,
                    disabledArrowColor: colors.textSecondary + '80',
                    monthTextColor: colors.text,
                    indicatorColor: colors.primary,
                    textDayFontWeight: '300',
                    textMonthFontWeight: 'bold',
                    textDayHeaderFontWeight: '300',
                    textDayFontSize: 16,
                    textMonthFontSize: 18,
                    textDayHeaderFontSize: 14,
                    agendaDayTextColor: colors.primary,
                    agendaDayNumColor: colors.primary,
                    agendaTodayColor: colors.tint,
                    agendaKnobColor: colors.primaryLight,
                    // Add more theme properties as needed
                }}
                style={styles.calendar}
            />
            {/* List of cards for the selected date */}
            <View style={styles.cardListContainer}>
                <Text style={[styles.listHeader, { color: colors.textSecondary }]}>
                    Tasks for {selectedDate ? new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, { month:'short', day:'numeric'}) : 'selected date'}
                </Text>
                {cardsForSelectedDate.length > 0 ? (
                    <FlatList
                        data={cardsForSelectedDate}
                        renderItem={renderCardItem}
                        keyExtractor={(item) => item.id}
                    />
                ) : (
                    <Text style={[styles.noCardsText, { color: colors.textSecondary }]}>No cards due on this date.</Text>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    calendar: {
        borderBottomWidth: 1,
        // borderColor applied dynamically via theme
    },
    cardListContainer: {
        flex: 1, // Take remaining space
        padding: 15,
    },
    listHeader: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    cardItem: {
        padding: 12,
        borderRadius: 5,
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    cardTitle: {
        fontSize: 14,
    },
    noCardsText: {
        textAlign: 'center',
        marginTop: 20,
        fontSize: 14,
    },
});

export default CalendarView; 