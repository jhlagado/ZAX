; ZAX lowered .asm trace
; range: $0100..$0188 (end exclusive)

; func first_byte begin
first_byte:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
ld A, (bytes10)                ; 010B: 3A 00 00
__zax_epilogue_0:
pop DE                         ; 010E: D1
pop BC                         ; 010F: C1
pop AF                         ; 0110: F1
ld SP, IX                      ; 0111: DD F9
pop IX                         ; 0113: DD E1
ret                            ; 0115: C9
; func first_byte end
; func read_word_at begin
read_word_at:
push IX                        ; 0116: DD E5
ld IX, $0000                   ; 0118: DD 21 00 00
add IX, SP                     ; 011C: DD 39
push AF                        ; 011E: F5
push BC                        ; 011F: C5
push DE                        ; 0120: D5
ld e, (ix+disp)                ; 0121: DD 5E 04
ld d, (ix+disp+1)              ; 0124: DD 56 05
ex de, hl                      ; 0127: EB
push HL                        ; 0128: E5
pop HL                         ; 0129: E1
add HL, HL                     ; 012A: 29
push HL                        ; 012B: E5
ld HL, words4                  ; 012C: 21 00 00
pop DE                         ; 012F: D1
add HL, DE                     ; 0130: 19
push HL                        ; 0131: E5
pop HL                         ; 0132: E1
push AF                        ; 0133: F5
ld A, (HL)                     ; 0134: 7E
inc HL                         ; 0135: 23
ld H, (HL)                     ; 0136: 66
ld L, A                        ; 0137: 6F
pop AF                         ; 0138: F1
__zax_epilogue_1:
pop DE                         ; 0139: D1
pop BC                         ; 013A: C1
pop AF                         ; 013B: F1
ld SP, IX                      ; 013C: DD F9
pop IX                         ; 013E: DD E1
ret                            ; 0140: C9
; func main begin
; func read_word_at end
main:
push IX                        ; 0141: DD E5
ld IX, $0000                   ; 0143: DD 21 00 00
add IX, SP                     ; 0147: DD 39
push AF                        ; 0149: F5
push BC                        ; 014A: C5
push DE                        ; 014B: D5
push HL                        ; 014C: E5
ld HL, $0002                   ; 014D: 21 02 00
push HL                        ; 0150: E5
call first_byte                ; 0151: CD 00 00
ld e, (ix+disp)                ; 0154: DD 5E F6
ld d, (ix+disp+1)              ; 0157: DD 56 F7
ex de, hl                      ; 015A: EB
push HL                        ; 015B: E5
call read_word_at              ; 015C: CD 00 00
inc SP                         ; 015F: 33
inc SP                         ; 0160: 33
__zax_epilogue_2:
ld HL, $0002                   ; 0161: 21 02 00
add HL, SP                     ; 0164: 39
ld SP, HL                      ; 0165: F9
pop HL                         ; 0166: E1
pop DE                         ; 0167: D1
pop BC                         ; 0168: C1
pop AF                         ; 0169: F1
ld SP, IX                      ; 016A: DD F9
pop IX                         ; 016C: DD E1
ret                            ; 016E: C9
; func main end

; symbols:
; label first_byte = $0100
; label __zax_epilogue_0 = $010E
; label read_word_at = $0116
; label __zax_epilogue_1 = $0139
; label main = $0141
; label __zax_epilogue_2 = $0161
; data bytes10 = $0170
; data words4 = $0180
