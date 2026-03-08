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
push AF                        ; 010B: F5
push BC                        ; 010C: C5
push DE                        ; 010D: D5
ex DE, HL                      ; 010E: EB
ld E, (IX + $0004)             ; 010F: DD 5E 04
ld D, (IX + $0005)             ; 0112: DD 56 05
ex DE, HL                      ; 0115: EB
push HL                        ; 0116: E5
pop HL                         ; 0117: E1
push HL                        ; 0118: E5
ld HL, sample_bytes            ; 0119: 21 00 00
pop DE                         ; 011C: D1
add HL, DE                     ; 011D: 19
push HL                        ; 011E: E5
pop HL                         ; 011F: E1
pop DE                         ; 0120: D1
pop BC                         ; 0121: C1
pop AF                         ; 0122: F1
ld A, (hl)                     ; 0123: 7E
ld L, A                        ; 0124: 6F
ld H, $0000                    ; 0125: 26 00
__zax_epilogue_0:
pop DE                         ; 0127: D1
pop BC                         ; 0128: C1
pop AF                         ; 0129: F1
ld SP, IX                      ; 012A: DD F9
pop IX                         ; 012C: DD E1
ret                            ; 012E: C9
; func read_byte_at end
; func read_word_at begin
read_word_at:
push IX                        ; 012F: DD E5
ld IX, $0000                   ; 0131: DD 21 00 00
add IX, SP                     ; 0135: DD 39
push AF                        ; 0137: F5
push BC                        ; 0138: C5
push DE                        ; 0139: D5
push AF                        ; 013A: F5
push BC                        ; 013B: C5
push DE                        ; 013C: D5
ex DE, HL                      ; 013D: EB
ld E, (IX + $0004)             ; 013E: DD 5E 04
ld D, (IX + $0005)             ; 0141: DD 56 05
ex DE, HL                      ; 0144: EB
push HL                        ; 0145: E5
pop HL                         ; 0146: E1
add HL, HL                     ; 0147: 29
push HL                        ; 0148: E5
ld HL, sample_words            ; 0149: 21 00 00
pop DE                         ; 014C: D1
add HL, DE                     ; 014D: 19
push HL                        ; 014E: E5
pop HL                         ; 014F: E1
pop DE                         ; 0150: D1
pop BC                         ; 0151: C1
pop AF                         ; 0152: F1
push DE                        ; 0153: D5
ld E, (HL)                     ; 0154: 5E
inc HL                         ; 0155: 23
ld D, (HL)                     ; 0156: 56
ld L, E                        ; 0157: 6B
ld H, D                        ; 0158: 62
pop DE                         ; 0159: D1
__zax_epilogue_1:
pop DE                         ; 015A: D1
pop BC                         ; 015B: C1
pop AF                         ; 015C: F1
ld SP, IX                      ; 015D: DD F9
pop IX                         ; 015F: DD E1
ret                            ; 0161: C9
; func main begin
; func read_word_at end
main:
push IX                        ; 0162: DD E5
ld IX, $0000                   ; 0164: DD 21 00 00
add IX, SP                     ; 0168: DD 39
push AF                        ; 016A: F5
push BC                        ; 016B: C5
push DE                        ; 016C: D5
push HL                        ; 016D: E5
ld HL, $0003                   ; 016E: 21 03 00
push HL                        ; 0171: E5
call read_byte_at              ; 0172: CD 00 00
inc SP                         ; 0175: 33
inc SP                         ; 0176: 33
ld HL, $0001                   ; 0177: 21 01 00
push HL                        ; 017A: E5
call read_word_at              ; 017B: CD 00 00
inc SP                         ; 017E: 33
inc SP                         ; 017F: 33
__zax_epilogue_2:
pop HL                         ; 0180: E1
pop DE                         ; 0181: D1
pop BC                         ; 0182: C1
pop AF                         ; 0183: F1
ld SP, IX                      ; 0184: DD F9
pop IX                         ; 0186: DD E1
ret                            ; 0188: C9
; func main end

; symbols:
; label read_byte_at = $0100
; label __zax_epilogue_0 = $0127
; label read_word_at = $012F
; label __zax_epilogue_1 = $015A
; label main = $0162
; label __zax_epilogue_2 = $0180
; data sample_bytes = $1000
; data sample_words = $100A
; label __zax_startup = $1012
