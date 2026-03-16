; ZAX lowered .asm trace
; range: $0100..$107B (end exclusive)

; func read_byte_at begin
read_byte_at:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
push DE                        ; 010B: D5
push HL                        ; 010C: E5
ld de, sample_bytes            ; 010D: 11 00 00
ex DE, HL                      ; 0110: EB
ld E, (IX + $0004)             ; 0111: DD 5E 04
ld D, (IX + $0005)             ; 0114: DD 56 05
ex DE, HL                      ; 0117: EB
add HL, DE                     ; 0118: 19
ld A, (HL)                     ; 0119: 7E
pop HL                         ; 011A: E1
pop DE                         ; 011B: D1
ld L, A                        ; 011C: 6F
ld H, $0000                    ; 011D: 26 00
__zax_epilogue_0:
pop DE                         ; 011F: D1
pop BC                         ; 0120: C1
pop AF                         ; 0121: F1
ld SP, IX                      ; 0122: DD F9
pop IX                         ; 0124: DD E1
ret                            ; 0126: C9
; func read_byte_at end
; func read_word_at begin
read_word_at:
push IX                        ; 0127: DD E5
ld IX, $0000                   ; 0129: DD 21 00 00
add IX, SP                     ; 012D: DD 39
push AF                        ; 012F: F5
push BC                        ; 0130: C5
push DE                        ; 0131: D5
push DE                        ; 0132: D5
ld de, sample_words            ; 0133: 11 00 00
ex DE, HL                      ; 0136: EB
ld E, (IX + $0004)             ; 0137: DD 5E 04
ld D, (IX + $0005)             ; 013A: DD 56 05
ex DE, HL                      ; 013D: EB
add HL, HL                     ; 013E: 29
add HL, DE                     ; 013F: 19
ld E, (HL)                     ; 0140: 5E
inc HL                         ; 0141: 23
ld D, (HL)                     ; 0142: 56
ld L, E                        ; 0143: 6B
ld H, D                        ; 0144: 62
pop DE                         ; 0145: D1
__zax_epilogue_1:
pop DE                         ; 0146: D1
pop BC                         ; 0147: C1
pop AF                         ; 0148: F1
ld SP, IX                      ; 0149: DD F9
pop IX                         ; 014B: DD E1
ret                            ; 014D: C9
; func main begin
; func read_word_at end
main:
push IX                        ; 014E: DD E5
ld IX, $0000                   ; 0150: DD 21 00 00
add IX, SP                     ; 0154: DD 39
push AF                        ; 0156: F5
push BC                        ; 0157: C5
push DE                        ; 0158: D5
push HL                        ; 0159: E5
ld HL, $0003                   ; 015A: 21 03 00
push HL                        ; 015D: E5
call read_byte_at              ; 015E: CD 00 00
inc SP                         ; 0161: 33
inc SP                         ; 0162: 33
ld HL, $0001                   ; 0163: 21 01 00
push HL                        ; 0166: E5
call read_word_at              ; 0167: CD 00 00
inc SP                         ; 016A: 33
inc SP                         ; 016B: 33
__zax_epilogue_2:
pop HL                         ; 016C: E1
pop DE                         ; 016D: D1
pop BC                         ; 016E: C1
pop AF                         ; 016F: F1
ld SP, IX                      ; 0170: DD F9
pop IX                         ; 0172: DD E1
ret                            ; 0174: C9
; func main end

; symbols:
; label read_byte_at = $0100
; label __zax_epilogue_0 = $011F
; label read_word_at = $0127
; label __zax_epilogue_1 = $0146
; label main = $014E
; label __zax_epilogue_2 = $016C
; data sample_bytes = $1000
; data sample_words = $100A
; label __zax_startup = $1012
