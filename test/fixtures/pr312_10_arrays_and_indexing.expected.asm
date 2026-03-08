; ZAX lowered .asm trace
; range: $0100..$107B (end exclusive)

; func first_byte begin
first_byte:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
push AF                        ; 010B: F5
push BC                        ; 010C: C5
push DE                        ; 010D: D5
ld HL, bytes10                 ; 010E: 21 00 00
pop DE                         ; 0111: D1
pop BC                         ; 0112: C1
pop AF                         ; 0113: F1
ld A, (hl)                     ; 0114: 7E
ld L, A                        ; 0115: 6F
ld H, $0000                    ; 0116: 26 00
__zax_epilogue_0:
pop DE                         ; 0118: D1
pop BC                         ; 0119: C1
pop AF                         ; 011A: F1
ld SP, IX                      ; 011B: DD F9
pop IX                         ; 011D: DD E1
ret                            ; 011F: C9
; func first_byte end
; func read_word_at begin
read_word_at:
push IX                        ; 0120: DD E5
ld IX, $0000                   ; 0122: DD 21 00 00
add IX, SP                     ; 0126: DD 39
push AF                        ; 0128: F5
push BC                        ; 0129: C5
push DE                        ; 012A: D5
push AF                        ; 012B: F5
push BC                        ; 012C: C5
push DE                        ; 012D: D5
ex DE, HL                      ; 012E: EB
ld E, (IX + $0004)             ; 012F: DD 5E 04
ld D, (IX + $0005)             ; 0132: DD 56 05
ex DE, HL                      ; 0135: EB
push HL                        ; 0136: E5
pop HL                         ; 0137: E1
add HL, HL                     ; 0138: 29
push HL                        ; 0139: E5
ld HL, words4                  ; 013A: 21 00 00
pop DE                         ; 013D: D1
add HL, DE                     ; 013E: 19
push HL                        ; 013F: E5
pop HL                         ; 0140: E1
pop DE                         ; 0141: D1
pop BC                         ; 0142: C1
pop AF                         ; 0143: F1
push DE                        ; 0144: D5
ld E, (HL)                     ; 0145: 5E
inc HL                         ; 0146: 23
ld D, (HL)                     ; 0147: 56
ld L, E                        ; 0148: 6B
ld H, D                        ; 0149: 62
pop DE                         ; 014A: D1
__zax_epilogue_1:
pop DE                         ; 014B: D1
pop BC                         ; 014C: C1
pop AF                         ; 014D: F1
ld SP, IX                      ; 014E: DD F9
pop IX                         ; 0150: DD E1
ret                            ; 0152: C9
; func main begin
; func read_word_at end
main:
push IX                        ; 0153: DD E5
ld IX, $0000                   ; 0155: DD 21 00 00
add IX, SP                     ; 0159: DD 39
push HL                        ; 015B: E5
ld HL, $0002                   ; 015C: 21 02 00
ex (SP), HL                    ; 015F: E3
push AF                        ; 0160: F5
push BC                        ; 0161: C5
push DE                        ; 0162: D5
push HL                        ; 0163: E5
call first_byte                ; 0164: CD 00 00
ex DE, HL                      ; 0167: EB
ld E, (IX - $0002)             ; 0168: DD 5E FE
ld D, (IX - $0001)             ; 016B: DD 56 FF
ex DE, HL                      ; 016E: EB
push HL                        ; 016F: E5
call read_word_at              ; 0170: CD 00 00
inc SP                         ; 0173: 33
inc SP                         ; 0174: 33
__zax_epilogue_2:
pop HL                         ; 0175: E1
pop DE                         ; 0176: D1
pop BC                         ; 0177: C1
pop AF                         ; 0178: F1
ld SP, IX                      ; 0179: DD F9
pop IX                         ; 017B: DD E1
ret                            ; 017D: C9
; func main end

; symbols:
; label first_byte = $0100
; label __zax_epilogue_0 = $0118
; label read_word_at = $0120
; label __zax_epilogue_1 = $014B
; label main = $0153
; label __zax_epilogue_2 = $0175
; data bytes10 = $1000
; data words4 = $100A
; label __zax_startup = $1012
