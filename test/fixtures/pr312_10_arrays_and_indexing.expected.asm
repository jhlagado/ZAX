; ZAX lowered .asm trace
; range: $0100..$0184 (end exclusive)

; func first_byte begin
first_byte:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
ld A, (bytes10)                ; 010B: 3A 00 00
ld L, A                        ; 010E: 6F
ld H, $0000                    ; 010F: 26 00
__zax_epilogue_0:
pop DE                         ; 0111: D1
pop BC                         ; 0112: C1
pop AF                         ; 0113: F1
ld SP, IX                      ; 0114: DD F9
pop IX                         ; 0116: DD E1
ret                            ; 0118: C9
; func first_byte end
; func read_word_at begin
read_word_at:
push IX                        ; 0119: DD E5
ld IX, $0000                   ; 011B: DD 21 00 00
add IX, SP                     ; 011F: DD 39
push AF                        ; 0121: F5
push BC                        ; 0122: C5
push DE                        ; 0123: D5
push DE                        ; 0124: D5
ld de, words4                  ; 0125: 11 00 00
ex DE, HL                      ; 0128: EB
ld E, (IX + $0004)             ; 0129: DD 5E 04
ld D, (IX + $0005)             ; 012C: DD 56 05
ex DE, HL                      ; 012F: EB
add HL, HL                     ; 0130: 29
add HL, DE                     ; 0131: 19
ld E, (HL)                     ; 0132: 5E
inc HL                         ; 0133: 23
ld D, (HL)                     ; 0134: 56
ld L, E                        ; 0135: 6B
ld H, D                        ; 0136: 62
pop DE                         ; 0137: D1
__zax_epilogue_1:
pop DE                         ; 0138: D1
pop BC                         ; 0139: C1
pop AF                         ; 013A: F1
ld SP, IX                      ; 013B: DD F9
pop IX                         ; 013D: DD E1
ret                            ; 013F: C9
; func main begin
; func read_word_at end
main:
push IX                        ; 0140: DD E5
ld IX, $0000                   ; 0142: DD 21 00 00
add IX, SP                     ; 0146: DD 39
push HL                        ; 0148: E5
ld HL, $0002                   ; 0149: 21 02 00
ex (SP), HL                    ; 014C: E3
push AF                        ; 014D: F5
push BC                        ; 014E: C5
push DE                        ; 014F: D5
push HL                        ; 0150: E5
call first_byte                ; 0151: CD 00 00
ex DE, HL                      ; 0154: EB
ld E, (IX - $0002)             ; 0155: DD 5E FE
ld D, (IX - $0001)             ; 0158: DD 56 FF
ex DE, HL                      ; 015B: EB
push HL                        ; 015C: E5
call read_word_at              ; 015D: CD 00 00
inc SP                         ; 0160: 33
inc SP                         ; 0161: 33
__zax_epilogue_2:
pop HL                         ; 0162: E1
pop DE                         ; 0163: D1
pop BC                         ; 0164: C1
pop AF                         ; 0165: F1
ld SP, IX                      ; 0166: DD F9
pop IX                         ; 0168: DD E1
ret                            ; 016A: C9
; func main end

; symbols:
; label first_byte = $0100
; label __zax_epilogue_0 = $0111
; label read_word_at = $0119
; label __zax_epilogue_1 = $0138
; label main = $0140
; label __zax_epilogue_2 = $0162
; data bytes10 = $016C
; data words4 = $017C
