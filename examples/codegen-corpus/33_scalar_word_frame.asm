; ZAX lowered .asm trace
; range: $0100..$2055 (end exclusive)

; func touch_scalar_word_frame begin
touch_scalar_word_frame:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
push AF                        ; 010B: F5
push BC                        ; 010C: C5
push DE                        ; 010D: D5
push IX                        ; 010E: DD E5
pop HL                         ; 0110: E1
ld DE, $0004                   ; 0111: 11 04 00
add HL, DE                     ; 0114: 19
push HL                        ; 0115: E5
pop HL                         ; 0116: E1
pop DE                         ; 0117: D1
pop BC                         ; 0118: C1
pop AF                         ; 0119: F1
ld E, (HL)                     ; 011A: 5E
inc HL                         ; 011B: 23
ld D, (HL)                     ; 011C: 56
ld E, E                        ; 011D: 5B
ld D, D                        ; 011E: 52
push AF                        ; 011F: F5
push BC                        ; 0120: C5
push DE                        ; 0121: D5
push IX                        ; 0122: DD E5
pop HL                         ; 0124: E1
ld DE, $0004                   ; 0125: 11 04 00
add HL, DE                     ; 0128: 19
push HL                        ; 0129: E5
pop HL                         ; 012A: E1
pop DE                         ; 012B: D1
pop BC                         ; 012C: C1
pop AF                         ; 012D: F1
ld (HL), E                     ; 012E: 73
inc HL                         ; 012F: 23
ld (HL), D                     ; 0130: 72
ex DE, HL                      ; 0131: EB
__zax_epilogue_0:
pop DE                         ; 0132: D1
pop BC                         ; 0133: C1
pop AF                         ; 0134: F1
ld SP, IX                      ; 0135: DD F9
pop IX                         ; 0137: DD E1
ret                            ; 0139: C9
; func main begin
; func touch_scalar_word_frame end
main:
push IX                        ; 013A: DD E5
ld IX, $0000                   ; 013C: DD 21 00 00
add IX, SP                     ; 0140: DD 39
push AF                        ; 0142: F5
push BC                        ; 0143: C5
push DE                        ; 0144: D5
push HL                        ; 0145: E5
ld HL, $1234                   ; 0146: 21 34 12
push HL                        ; 0149: E5
call touch_scalar_word_frame   ; 014A: CD 00 00
inc SP                         ; 014D: 33
inc SP                         ; 014E: 33
__zax_epilogue_1:
pop HL                         ; 014F: E1
pop DE                         ; 0150: D1
pop BC                         ; 0151: C1
pop AF                         ; 0152: F1
ld SP, IX                      ; 0153: DD F9
pop IX                         ; 0155: DD E1
ret                            ; 0157: C9
; func main end

; symbols:
; label touch_scalar_word_frame = $0100
; label __zax_epilogue_0 = $0132
; label main = $013A
; label __zax_epilogue_1 = $014F
; data dummy = $2000
; label __zax_startup = $2002
