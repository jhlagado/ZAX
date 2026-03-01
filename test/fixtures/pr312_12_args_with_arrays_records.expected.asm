; ZAX lowered .asm trace
; range: $0100..$0190 (end exclusive)

; func read_byte_at begin
read_byte_at:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
ex DE, HL                      ; 010B: EB
ld E, (IX + $0004)             ; 010C: DD 5E 04
ld D, (IX + $0005)             ; 010F: DD 56 05
ex DE, HL                      ; 0112: EB
push HL                        ; 0113: E5
pop HL                         ; 0114: E1
push HL                        ; 0115: E5
ld HL, sample_bytes            ; 0116: 21 00 00
pop DE                         ; 0119: D1
add HL, DE                     ; 011A: 19
push HL                        ; 011B: E5
pop HL                         ; 011C: E1
ld A, (hl)                     ; 011D: 7E
ld L, A                        ; 011E: 6F
ld H, $0000                    ; 011F: 26 00
__zax_epilogue_0:
pop DE                         ; 0121: D1
pop BC                         ; 0122: C1
pop AF                         ; 0123: F1
ld SP, IX                      ; 0124: DD F9
pop IX                         ; 0126: DD E1
ret                            ; 0128: C9
; func read_byte_at end
; func read_word_at begin
read_word_at:
push IX                        ; 0129: DD E5
ld IX, $0000                   ; 012B: DD 21 00 00
add IX, SP                     ; 012F: DD 39
push AF                        ; 0131: F5
push BC                        ; 0132: C5
push DE                        ; 0133: D5
push DE                        ; 0134: D5
ld de, sample_words            ; 0135: 11 00 00
ex DE, HL                      ; 0138: EB
ld E, (IX + $0004)             ; 0139: DD 5E 04
ld D, (IX + $0005)             ; 013C: DD 56 05
ex DE, HL                      ; 013F: EB
add HL, HL                     ; 0140: 29
add HL, DE                     ; 0141: 19
ld E, (HL)                     ; 0142: 5E
inc HL                         ; 0143: 23
ld D, (HL)                     ; 0144: 56
ld L, E                        ; 0145: 6B
ld H, D                        ; 0146: 62
pop DE                         ; 0147: D1
__zax_epilogue_1:
pop DE                         ; 0148: D1
pop BC                         ; 0149: C1
pop AF                         ; 014A: F1
ld SP, IX                      ; 014B: DD F9
pop IX                         ; 014D: DD E1
ret                            ; 014F: C9
; func main begin
; func read_word_at end
main:
push IX                        ; 0150: DD E5
ld IX, $0000                   ; 0152: DD 21 00 00
add IX, SP                     ; 0156: DD 39
push AF                        ; 0158: F5
push BC                        ; 0159: C5
push DE                        ; 015A: D5
push HL                        ; 015B: E5
ld HL, $0003                   ; 015C: 21 03 00
push HL                        ; 015F: E5
call read_byte_at              ; 0160: CD 00 00
inc SP                         ; 0163: 33
inc SP                         ; 0164: 33
ld HL, $0001                   ; 0165: 21 01 00
push HL                        ; 0168: E5
call read_word_at              ; 0169: CD 00 00
inc SP                         ; 016C: 33
inc SP                         ; 016D: 33
__zax_epilogue_2:
pop HL                         ; 016E: E1
pop DE                         ; 016F: D1
pop BC                         ; 0170: C1
pop AF                         ; 0171: F1
ld SP, IX                      ; 0172: DD F9
pop IX                         ; 0174: DD E1
ret                            ; 0176: C9
; func main end

; symbols:
; label read_byte_at = $0100
; label __zax_epilogue_0 = $0121
; label read_word_at = $0129
; label __zax_epilogue_1 = $0148
; label main = $0150
; label __zax_epilogue_2 = $016E
; data sample_bytes = $0178
; data sample_words = $0188
